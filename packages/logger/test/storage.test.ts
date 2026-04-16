jest.mock('dexie', () => {
  class DexieMock {
    static errnames = {
      Constraint: 'ConstraintError',
    };

    version() {
      return {
        stores: () => this,
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

import { StorageTransport } from '../src/transports/storage';

type Logs = {
  time: number;
  size: number;
  messages: string[];
  session: string;
};

class TestStorageTransport extends StorageTransport {
  protected _reportedErrors: unknown[] = [];

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

  get savingLogsSize() {
    return this._savingLogs.size;
  }

  get reportedErrors() {
    return this._reportedErrors;
  }

  protected _reportBackgroundError(error: unknown) {
    this._reportedErrors.push(error);
    return undefined;
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
    jest.useRealTimers();
  });

  test('retries on IndexedDB key collisions until the insert succeeds', async () => {
    const insertTimes: number[] = [];
    const collision = Object.assign(new Error('duplicate key'), {
      name: 'ConstraintError',
    });
    const transport = new TestStorageTransport();

    transport.setTable({
      add: jest.fn(async (data: Logs) => {
        insertTimes.push(data.time);
        if (insertTimes.length < 3) {
          throw collision;
        }
      }),
    });

    const data = createLogs(100);
    await transport.persistLogs(data, true);

    expect(insertTimes).toEqual([100, 101, 102]);
    expect(data.time).toBe(102);
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

    expect(transport.reportedErrors).toEqual([error]);
    expect(transport.savingLogsSize).toBe(0);
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
    expect(transport.savingLogsSize).toBe(0);
  });
});
