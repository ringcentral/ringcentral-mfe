jest.mock('dexie', () => {
  class DexieMock {
    version() {
      const dexie = this;
      return {
        stores() {
          return {
            upgrade() {
              return dexie;
            },
          };
        },
      };
    }

    table() {
      return {};
    }

    open() {
      return Promise.resolve();
    }
  }

  return DexieMock;
});

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

import { saveAs } from 'file-saver';

import {
  STORAGE_TRANSPORT_ERROR_EVENT,
  StorageTransport,
  type StorageTransportBackgroundError,
} from '../src/transports/storage';

type Logs = {
  time: number;
  size: number;
  messages: string[];
  session: string;
};

class TestStorageTransport extends StorageTransport {
  protected _reportedErrors: StorageTransportBackgroundError[] = [];

  setTable(table: { add: (data: Logs) => Promise<void> }) {
    this._table = table as any;
  }

  setCurrentData(data: Logs) {
    this._data = data;
  }

  async persistLogs(data: Logs, throwOnError = false) {
    return this._saveLogs(data, throwOnError);
  }

  async flushCurrentLogs(throwOnError = false) {
    return this._saveDB(throwOnError);
  }

  async waitForPendingSaves() {
    await this.savingLogsPromise;
  }

  saveTempLogs() {
    this._saveTemp();
  }

  restoreTempLogs() {
    this._restoreTempLogs();
  }

  get savingLogsSize() {
    return this._savingLogs.size;
  }

  get reportedErrors() {
    return this._reportedErrors;
  }

  get tempKey() {
    return this._tempKey;
  }

  get tempKeyPrefix() {
    return this._tempKeyPrefix;
  }

  protected _reportBackgroundError(
    error: unknown,
    phase: StorageTransportBackgroundError['phase'] = 'persist',
    tempStorageKey?: string
  ) {
    const event = super._reportBackgroundError(error, phase, tempStorageKey);
    this._reportedErrors.push(event);
    return event;
  }
}

const createLogs = (time = 1): Logs => ({
  time,
  size: 1,
  messages: ['message'],
  session: 'session-1',
});

const createSerializedMessage = (time = 1) =>
  ({
    message: '',
    payload: {
      context: {
        logLevel: 30,
        namespace: ['root-session'],
      },
      message: 'message',
      sequence: time,
      time,
    },
  }) as any;

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('StorageTransport', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers();
    window.localStorage.clear();
  });

  test('allows multiple writes with the same time value', async () => {
    const transport = new TestStorageTransport();
    const add = jest.fn(async () => undefined);

    transport.setTable({
      add,
    });

    const firstLogs = createLogs(100);
    const secondLogs = createLogs(100);
    await Promise.all([
      transport.persistLogs(firstLogs, true),
      transport.persistLogs(secondLogs, true),
    ]);

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(1, firstLogs);
    expect(add).toHaveBeenNthCalledWith(2, secondLogs);
    expect(transport.savingLogsSize).toBe(0);
    expect(transport.reportedErrors).toEqual([]);
  });

  test('serializes writes within a single transport instance', async () => {
    let resolveFirstWrite!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      resolveFirstWrite = resolve;
    });
    const transport = new TestStorageTransport();
    const add = jest
      .fn<Promise<void>, [Logs]>()
      .mockImplementationOnce(() => firstWrite)
      .mockResolvedValueOnce(undefined);

    transport.setTable({ add });

    const firstSave = transport.persistLogs(createLogs(1), true);
    const secondSave = transport.persistLogs(createLogs(2), true);
    await flushPromises();

    expect(add).toHaveBeenCalledTimes(1);

    resolveFirstWrite();
    await Promise.all([firstSave, secondSave]);

    expect(add).toHaveBeenCalledTimes(2);
  });

  test('captures background save failures without surfacing unhandled rejections', async () => {
    jest.useFakeTimers();
    const error = new Error('save failed');
    const transport = new TestStorageTransport({
      batchTimeout: 10,
      enabled: true,
    });

    transport.setTable({
      add: jest.fn(async () => {
        throw error;
      }),
    });

    transport.write(createSerializedMessage(1));
    await jest.advanceTimersByTimeAsync(10);
    await flushPromises();

    expect(transport.reportedErrors).toHaveLength(1);
    expect(transport.reportedErrors[0]).toMatchObject({
      error,
      phase: 'persist',
      transportName: transport.name,
    });
    expect(transport.savingLogsSize).toBe(1);
  });

  test('emits callback and custom event for background errors', async () => {
    jest.useFakeTimers();
    const error = new Error('save failed');
    const onBackgroundError = jest.fn();
    const eventHandler = jest.fn();
    const transport = new TestStorageTransport({
      batchTimeout: 10,
      enabled: true,
      onBackgroundError,
    });

    window.addEventListener(STORAGE_TRANSPORT_ERROR_EVENT, eventHandler as EventListener);
    transport.setTable({
      add: jest.fn(async () => {
        throw error;
      }),
    });

    transport.write(createSerializedMessage(1));
    await jest.advanceTimersByTimeAsync(10);
    await flushPromises();

    expect(onBackgroundError).toHaveBeenCalledTimes(1);
    expect(onBackgroundError).toHaveBeenCalledWith(
      expect.objectContaining({
        error,
        phase: 'persist',
        transportName: transport.name,
      })
    );
    expect(eventHandler).toHaveBeenCalledTimes(1);
    expect(eventHandler.mock.calls[0][0].detail).toEqual(
      expect.objectContaining({
        error,
        phase: 'persist',
        transportName: transport.name,
      })
    );

    window.removeEventListener(
      STORAGE_TRANSPORT_ERROR_EVENT,
      eventHandler as EventListener
    );
  });

  test('still rejects explicit save requests when persistence fails', async () => {
    const error = new Error('save failed');
    const transport = new TestStorageTransport();

    transport.setTable({
      add: jest.fn(async () => {
        throw error;
      }),
    });

    await expect(transport.persistLogs(createLogs(1), true)).rejects.toThrow(
      'save failed'
    );
    expect(transport.reportedErrors).toEqual([]);
    expect(transport.savingLogsSize).toBe(1);
  });

  test('persists failed in-flight batches to temp storage for recovery', async () => {
    const error = new Error('save failed');
    const transport = new TestStorageTransport();

    transport.setTable({
      add: jest.fn(async () => {
        throw error;
      }),
    });

    await expect(transport.persistLogs(createLogs(42), true)).rejects.toThrow(
      'save failed'
    );

    transport.saveTempLogs();

    const saved = window.localStorage.getItem(transport.tempKey);
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!)).toEqual([createLogs(42)]);
  });

  test('saveDB retries retained failed batches before pruning', async () => {
    const failedLogs = createLogs(50);
    const transport = new TestStorageTransport();
    const add = jest
      .fn<Promise<void>, [Logs]>()
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce(undefined);
    const pruneLogs = jest
      .spyOn(transport as any, '_pruneLogs')
      .mockResolvedValue(undefined);

    transport.setTable({ add });

    await expect(transport.persistLogs(failedLogs, true)).rejects.toThrow(
      'save failed'
    );

    await transport.saveDB();

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(2, failedLogs);
    expect(transport.savingLogsSize).toBe(0);
    expect(pruneLogs).toHaveBeenCalledTimes(1);
  });

  test('persists queued batches to temp storage before unload', async () => {
    let resolveFirstWrite!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      resolveFirstWrite = resolve;
    });
    const transport = new TestStorageTransport();
    const firstLogs = createLogs(1);
    const secondLogs = createLogs(2);
    const add = jest
      .fn<Promise<void>, [Logs]>()
      .mockImplementationOnce(() => firstWrite)
      .mockResolvedValueOnce(undefined);

    transport.setTable({ add });

    const firstSave = transport.persistLogs(firstLogs, true);
    const secondSave = transport.persistLogs(secondLogs, true);

    transport.saveTempLogs();

    const saved = window.localStorage.getItem(transport.tempKey);
    expect(saved).not.toBeNull();
    expect(JSON.parse(saved!)).toEqual([firstLogs, secondLogs]);

    resolveFirstWrite();
    await Promise.all([firstSave, secondSave]);
  });

  test('does not remove another instance temp storage when current instance has no logs', () => {
    const writer = new TestStorageTransport();
    const idle = new TestStorageTransport();

    window.localStorage.setItem(writer.tempKey, JSON.stringify([createLogs(7)]));

    idle.saveTempLogs();

    expect(window.localStorage.getItem(writer.tempKey)).toBe(
      JSON.stringify([createLogs(7)])
    );
  });

  test('restores legacy and instance-scoped temp logs', async () => {
    const transport = new TestStorageTransport();
    const add = jest.fn(async () => undefined);
    transport.setTable({ add });

    const legacyLogs = [createLogs(10)];
    const scopedLogs = [createLogs(20)];
    window.localStorage.setItem(
      transport.tempKeyPrefix,
      JSON.stringify(legacyLogs)
    );
    window.localStorage.setItem(
      `${transport.tempKeyPrefix}:other-instance`,
      JSON.stringify(scopedLogs)
    );

    transport.restoreTempLogs();
    await transport.waitForPendingSaves();

    expect(add).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem(transport.tempKeyPrefix)).toBeNull();
    expect(
      window.localStorage.getItem(`${transport.tempKeyPrefix}:other-instance`)
    ).toBeNull();
  });

  test('keeps remaining temp logs until restore writes succeed', async () => {
    const transport = new TestStorageTransport();
    const restoreKey = `${transport.tempKeyPrefix}:other-instance`;
    const firstLogs = createLogs(10);
    const secondLogs = createLogs(20);
    const error = new Error('save failed');
    const add = jest
      .fn<Promise<void>, [Logs]>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(error);

    transport.setTable({ add });
    window.localStorage.setItem(
      restoreKey,
      JSON.stringify([firstLogs, secondLogs])
    );

    transport.restoreTempLogs();
    await transport.waitForPendingSaves();
    await flushPromises();

    expect(add).toHaveBeenCalledTimes(2);
    expect(JSON.parse(window.localStorage.getItem(restoreKey)!)).toEqual([
      secondLogs,
    ]);
  });

  test('rejects download when flushing current logs fails', async () => {
    const error = new Error('save failed');
    const transport = new TestStorageTransport();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    transport.setTable({
      add: jest.fn(async () => {
        throw error;
      }),
    });
    transport.setCurrentData(createLogs(99));

    await expect(transport.downloadLogs()).rejects.toThrow('save failed');
    expect(saveAs).not.toHaveBeenCalled();
  });

  test('downloadLogs retries retained failed batches before exporting', async () => {
    const failedLogs = createLogs(60);
    const transport = new TestStorageTransport();
    const add = jest
      .fn<Promise<void>, [Logs]>()
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce(undefined);
    const content = new Blob(['logs']);
    const getLogs = jest
      .spyOn(transport, 'getLogs')
      .mockResolvedValue({ name: 'logs', content } as any);

    transport.setTable({ add });

    await expect(transport.persistLogs(failedLogs, true)).rejects.toThrow(
      'save failed'
    );

    await transport.downloadLogs();

    expect(add).toHaveBeenCalledTimes(2);
    expect(add).toHaveBeenNthCalledWith(2, failedLogs);
    expect(getLogs).toHaveBeenCalledTimes(1);
    expect(saveAs).toHaveBeenCalledWith(content, 'logs.zip');
    expect(transport.savingLogsSize).toBe(0);
  });
});
