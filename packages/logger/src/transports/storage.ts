/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
import { global } from '@ringcentral/mfe-shared';
import Dexie from 'dexie';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { getLogLevelName, Message } from 'roarr';
import { stringify } from 'safe-stable-stringify';

import type {
  ITransport,
  SerializedMessage,
  TransportInitOptions,
} from '../interface';

const DEFAULT_BATCH_SIZE = 1024 * 512; // 512KB
const DEFAULT_MAX_LOGS_SIZE = 1024 * 1024 * 100; // 100MB
const DEFAULT_BATCH_TIMEOUT = 1000 * 60 * 5; // 5 minutes
const DEFAULT_EXPIRED_TIME = 1000 * 60 * 60 * 24; // 1 day
const DEFAULT_RECENT_TIME = 1000 * 60 * 60; // 1 hour
const LEGACY_LOG_TABLE = 'logs';
const LOG_TABLE = 'logs_v2';
const CURRENT_DB_VERSION = 2;
const ZIP_PATH_SEPARATOR = '/';
const WINDOWS_INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;
const WINDOWS_RESERVED_FILE_NAME =
  /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const WINDOWS_TRAILING_DOTS_AND_SPACES = /[. ]+$/;
const ZIP_ENTRY_FALLBACK_NAME = 'log';

export const STORAGE_TRANSPORT_ERROR_EVENT = 'rc-mfe-storage-error';

function formatZipTimestamp(time: number) {
  return new Date(time).toISOString().replace(/:/g, '-');
}

// Log archives are often extracted on Windows, so every zip path segment must
// also be a valid Windows file name.
function sanitizeZipFileName(fileName: string) {
  const sanitizedName = fileName
    .replace(WINDOWS_INVALID_FILE_NAME_CHARS, '-')
    .replace(WINDOWS_TRAILING_DOTS_AND_SPACES, '');
  const safeName = sanitizedName || ZIP_ENTRY_FALLBACK_NAME;

  if (WINDOWS_RESERVED_FILE_NAME.test(safeName)) {
    const extensionIndex = safeName.lastIndexOf('.');
    if (extensionIndex > 0) {
      return `${safeName.slice(0, extensionIndex)}_${safeName.slice(
        extensionIndex
      )}`;
    }

    return `${safeName}_`;
  }

  return safeName;
}

// Keep zip folder separators while normalizing each path segment separately.
function sanitizeZipPath(path: string) {
  return path
    .replace(/\\/g, ZIP_PATH_SEPARATOR)
    .split(ZIP_PATH_SEPARATOR)
    .map((segment) => {
      if (!segment || segment === '.' || segment === '..') {
        return ZIP_ENTRY_FALLBACK_NAME;
      }

      return sanitizeZipFileName(segment);
    })
    .join(ZIP_PATH_SEPARATOR);
}

// Different raw names can collapse to the same sanitized path, for example
// ISO timestamps that only differ by ':' and '?' separators.
function getUniqueZipPath(path: string, usedPaths: Set<string>) {
  const segments = path.split(ZIP_PATH_SEPARATOR);
  const fileName = segments.pop()!;
  const extensionIndex = fileName.lastIndexOf('.');
  const baseName =
    extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  const extension = extensionIndex > 0 ? fileName.slice(extensionIndex) : '';
  let safePath = path;
  let index = 2;

  while (usedPaths.has(safePath.toLowerCase())) {
    safePath = [...segments, `${baseName}-${index}${extension}`].join(
      ZIP_PATH_SEPARATOR
    );
    index += 1;
  }

  usedPaths.add(safePath.toLowerCase());
  return safePath;
}

export type StorageTransportBackgroundError = {
  error: unknown;
  phase: 'init' | 'persist' | 'prune' | 'restore' | 'restore-parse';
  transportName: string;
  session?: string;
  instanceId: string;
  tempStorageKey?: string;
};

interface Logs {
  id?: number;
  /**
   * time of the first log in batched logs
   */
  time: number;
  /**
   * size of all batched logs
   */
  size: number;
  /**
   * all batched logs
   */
  messages: string[];
  /**
   * session of logger
   */
  session?: string;
}

interface StorageTransportOptions {
  /**
   * version of database
   */
  version?: number;
  /**
   * enabled storage transport
   */
  enabled?: boolean;
  /**
   * stringify payload
   */
  stringify?: (payload: Message) => string;
  /**
   * batch number, default 512KB
   */
  batchNumber?: number;
  /**
   * batch timeout, default 5 minutes
   */
  batchTimeout?: number;
  /**
   * prefix of database name
   */
  prefix?: string;
  /**
   * expired time of logs, default 1 days
   */
  expired?: number;
  /**
   * max size of logs, default 100MB
   */
  maxLogsSize?: number;
  /**
   * recent time for getting logs, default 1 hour
   */
  recentTime?: number;
  /**
   * receive non-throwing background transport errors
   */
  onBackgroundError?: (event: StorageTransportBackgroundError) => void;
}

export type ExtraLogs = {
  /**
   * log content (string for text files, or binary data types for other formats)
   */
  log: string | ArrayBuffer | Uint8Array | Blob;
  /**
   * name of the log file
   */
  fileName: string;
}[];

export class StorageTransport implements ITransport {
  type = 'storage';

  protected _logs = new Map<number, Logs>();

  protected _table?: Dexie.Table<Logs, number>;

  protected _session?: string;

  protected _instanceId = `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  constructor(protected _options: StorageTransportOptions = {}) {}

  async init({ session }: TransportInitOptions) {
    this._session = session;
    this._data.session = session;
    // TODO: refactor this with teardown
    if (this._options.enabled) {
      this._runInBackground(this._initDB(), 'init');
      this._onUnload();
      if (global.localStorage) {
        const key = this._pruneKey;
        const PrunedTime = global.localStorage.getItem(key);
        if (PrunedTime !== new Date().toLocaleDateString()) {
          setTimeout(() => {
            this._runInBackground(
              this._pruneLogs().then(() => {
                global.localStorage.setItem(
                  key,
                  new Date().toLocaleDateString()
                );
              }),
              'prune'
            );
            // Avoid running during peak startup load.
            // 5 seconds later
          }, 5 * 1000);
        }
      }
      setInterval(() => {
        this._runInBackground(this._pruneLogs(), 'prune');
      }, this.expiredTime);
    }
  }

  protected _onUnload() {
    if (global.localStorage) {
      this._restoreTempLogs();
      window.addEventListener('beforeunload', () => {
        this._saveTemp();
      });
    }
  }

  protected _saveTemp() {
    const saveData: Logs[] = [];
    // unsaved current logs
    if (this._data.messages.length) {
      saveData.push(this._data);
    }
    // saving logs
    if (this._savingLogs.size) {
      this._savingLogs.forEach((data) => {
        saveData.push(data);
      });
    }
    if (saveData.length) {
      global.localStorage.setItem(this._tempKey, stringify(saveData));
    } else {
      global.localStorage.removeItem(this._tempKey);
    }
  }

  protected get _tempKeyPrefix() {
    return `${this.name}-temp`;
  }

  protected get _tempKey() {
    return `${this._tempKeyPrefix}:${this._instanceId}`;
  }

  protected get _pruneKey() {
    return `${this.name}-prune-time`;
  }

  protected _getTempKeys() {
    if (!global.localStorage) return [];
    const keys: string[] = [];
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (
        key === this._tempKeyPrefix ||
        key?.startsWith(`${this._tempKeyPrefix}:`)
      ) {
        keys.push(key);
      }
    }
    return keys;
  }

  protected _restoreTempLogs() {
    this._getTempKeys().forEach((key) => {
      const tempLogs = global.localStorage.getItem(key);
      if (!tempLogs) return;
      try {
        const logs = JSON.parse(tempLogs) as Logs[];
        this._runInBackground(this._restoreTempKey(key, logs), 'restore', key);
      } catch (error) {
        this._reportBackgroundError(error, 'restore-parse', key);
      }
    });
  }

  protected async _restoreTempKey(key: string, logs: Logs[]) {
    const pendingLogs = [...logs];
    while (pendingLogs.length) {
      const data = pendingLogs[0];
      await this._saveLogs(data, true);
      pendingLogs.shift();
      if (pendingLogs.length) {
        global.localStorage.setItem(key, stringify(pendingLogs));
      } else {
        global.localStorage.removeItem(key);
      }
    }
  }

  get options() {
    return this._options;
  }

  get name() {
    return `${this._options.prefix ?? 'rc-mfe'}:log`;
  }

  protected async _initDB() {
    const db = new Dexie(this.name);
    db.version(1).stores({
      [LEGACY_LOG_TABLE]: '&time, size',
    });
    db.version(
      Math.max(this._options.version ?? CURRENT_DB_VERSION, CURRENT_DB_VERSION)
    )
      .stores({
        [LEGACY_LOG_TABLE]: '&time, size',
        [LOG_TABLE]: '++id, time, size',
      })
      .upgrade(async (tx) => {
        const legacyLogs = (await tx
          .table(LEGACY_LOG_TABLE)
          .toArray()) as Logs[];
        if (!legacyLogs.length) return;
        const migratedLogs = legacyLogs.map(
          ({ time, size, messages, session }) => ({
            time,
            size,
            messages,
            session,
          })
        );
        await tx.table(LOG_TABLE).bulkPut(migratedLogs);
        await tx.table(LEGACY_LOG_TABLE).clear();
      });
    this._table = db.table(LOG_TABLE);
    await db.open();
  }

  protected _data: Logs = {
    time: Date.now(),
    size: 0,
    messages: [],
  };

  get batchSize() {
    return this._options.batchNumber ?? DEFAULT_BATCH_SIZE;
  }

  get batchTimeout() {
    return this._options.batchTimeout ?? DEFAULT_BATCH_TIMEOUT;
  }

  protected _timeout: ReturnType<typeof setTimeout> | null = null;

  write({ payload }: SerializedMessage) {
    if (this._options.enabled) {
      const message = this._stringify(payload);
      this._data.size += message.length;
      this._data.messages.push(message);
      if (this._data.size > this.batchSize) {
        this._runInBackground(this._saveDB());
      } else if (!this._timeout) {
        this._timeout = setTimeout(() => {
          this._runInBackground(this._saveDB());
        }, this.batchTimeout);
      }
    }
  }

  protected _stringify(payload: Message) {
    if (this._options.stringify) {
      return this._options.stringify(payload);
    }
    return `${new Date(payload.time).toISOString()}|${
      payload.sequence
    } ${getLogLevelName(payload.context.logLevel as number)}: [${(
      payload.context.namespace as string[]
    ).join(':')}] MSG: ${payload.message}`;
  }

  /**
   * save memory logs to database and prune logs
   */
  async saveDB() {
    await this._saveDB(true);
    await this._flushSavingLogs(true);
    await this._pruneLogs();
  }

  protected _saveDB(throwOnError = false) {
    clearTimeout(this._timeout!);
    this._timeout = null;
    const data = this._data;
    this._data = {
      time: Date.now(),
      size: 0,
      messages: [],
      session: this._session!,
    };
    if (!data.messages.length) return;
    return this._saveLogs(data, throwOnError);
  }

  /**
   * saving logs promise
   */
  savingLogsPromise: Promise<void> = Promise.resolve();

  protected _savingLogs = new Set<Logs>();

  protected _saveLogs(data: Logs, throwOnError = false) {
    this._savingLogs.add(data);
    const saveOperation = this.savingLogsPromise.then(async () => {
      await this._table?.add(data);
      this._savingLogs.delete(data);
    });
    this.savingLogsPromise = saveOperation.catch(() => undefined);
    if (throwOnError) {
      return saveOperation;
    }
    return saveOperation.catch((error) => {
      this._reportBackgroundError(error, 'persist');
    });
  }

  protected _flushSavingLogs(throwOnError = false) {
    const flushOperation = this.savingLogsPromise.then(async () => {
      const pendingLogs = Array.from(this._savingLogs);
      for (const data of pendingLogs) {
        await this._saveLogs(data, true);
      }
    });
    if (throwOnError) {
      return flushOperation;
    }
    return flushOperation.catch((error) => {
      this._reportBackgroundError(error, 'persist');
    });
  }

  protected _runInBackground(
    task?: Promise<unknown>,
    phase: StorageTransportBackgroundError['phase'] = 'persist',
    tempStorageKey?: string
  ) {
    void task?.catch((error) => {
      this._reportBackgroundError(error, phase, tempStorageKey);
    });
  }

  // Background storage tasks must never surface as application-level rejections,
  // but they must remain observable for diagnostics.
  protected _reportBackgroundError(
    error: unknown,
    phase: StorageTransportBackgroundError['phase'] = 'persist',
    tempStorageKey?: string
  ) {
    const event = {
      error,
      phase,
      transportName: this.name,
      session: this._session,
      instanceId: this._instanceId,
      tempStorageKey,
    };
    try {
      this._options.onBackgroundError?.(event);
    } catch {
      //
    }
    try {
      if (
        typeof global.dispatchEvent === 'function' &&
        typeof CustomEvent === 'function'
      ) {
        global.dispatchEvent(
          new CustomEvent(STORAGE_TRANSPORT_ERROR_EVENT, {
            detail: event,
          })
        );
      }
    } catch {
      //
    }
    return event;
  }

  get expiredTime() {
    return this._options.expired ?? DEFAULT_EXPIRED_TIME;
  }

  protected _deleteExpiredLogs() {
    return this._deleteLogs(Date.now() - this.expiredTime);
  }

  protected _deleteLogs(time: number) {
    return this._table?.where('time').below(time).delete();
  }

  protected async _getLogs() {
    return this._table?.orderBy('time').toArray();
  }

  get maxLogsSize() {
    return this._options.maxLogsSize ?? DEFAULT_MAX_LOGS_SIZE;
  }

  // fast way to get total size of logs
  protected async _getTotalSize() {
    const sizes =
      ((await this._table?.orderBy('size').keys()) as number[]) ?? [];
    return sizes.reduce((acc, size) => {
      return acc + size;
    }, 0);
  }

  protected async _pruneLogs() {
    await this._deleteExpiredLogs();
    // only prune logs if total size is greater than maxLogsSize
    const totalLogSize = await this._getTotalSize();
    if (totalLogSize > this.maxLogsSize) {
      let sizeOverBy = this.maxLogsSize;
      let cutoffTime = 0;

      await this._table
        ?.orderBy('time')
        .reverse()
        .until((log: Logs) => {
          sizeOverBy -= log.size;
          if (sizeOverBy <= 0) {
            cutoffTime = log.time;
            return true;
          }
          return false;
        })
        .toArray();

      if (cutoffTime > 0) {
        await this._deleteLogs(cutoffTime);
      }
    }
  }

  get recentTime() {
    return this._options.recentTime ?? DEFAULT_RECENT_TIME;
  }

  /**
   * query logs in the recent time
   */
  async queryLogs({
    name: _name = this.name,
    recentTime = this.recentTime,
    extraLogs = [],
  }: {
    /**
     * name of the zip file
     */
    name?: string;
    /**
     * recent time of the logs
     */
    recentTime?: number;
    /**
     * extra logs
     */
    extraLogs?: ExtraLogs;
  } = {}) {
    const allLogs = (await this._getLogs()) ?? [];
    const allSessions = new Set(allLogs.map((log) => log.session));
    const data =
      (await this._table
        ?.where('time')
        .above(Date.now() - recentTime)
        .sortBy('time')) ?? [];
    if (!data.length) return;
    const endTime = formatZipTimestamp(data[data.length - 1].time);
    const startTime = formatZipTimestamp(data[0].time);
    const name = sanitizeZipFileName(`${_name}_${startTime}_${endTime}`);
    const logs = data.map((item) => item.messages.join('\n')).join('\n');
    const zip = new JSZip();
    const logFolder = zip.folder(name)!;
    logFolder.file('recent.log', `${logs}\n`);
    const historyFolder = logFolder.folder('history')!;
    const historyPaths = new Set<string>();
    for (const session of allSessions) {
      const _logs = allLogs
        .filter((log) => log.session === session)
        .map((item) => item.messages.join('\n'))
        .join('\n');
      const historyPath = getUniqueZipPath(
        sanitizeZipFileName(`${session}.log`),
        historyPaths
      );
      historyFolder.file(historyPath, `${_logs}\n`);
    }
    const extraLogPaths = new Set<string>();
    for (const extraLog of extraLogs) {
      const extraLogPath = getUniqueZipPath(
        sanitizeZipPath(extraLog.fileName),
        extraLogPaths
      );
      // Append a newline for string logs to ensure proper text formatting.
      // Binary data is treated as raw data and does not require a newline.
      if (typeof extraLog.log === 'string') {
        zip.file(extraLogPath, `${extraLog.log}\n`);
      } else {
        zip.file(extraLogPath, extraLog.log);
      }
    }
    return {
      name,
      zip,
    };
  }

  /**
   * get logs in the recent time
   */
  async getLogs({
    name: _name = this.name,
    recentTime = this.recentTime,
    extraLogs = [],
  }: {
    /**
     * name of the zip file
     */
    name?: string;
    /**
     * recent time of the logs
     */
    recentTime?: number;
    /**
     * extra logs
     */
    extraLogs?: ExtraLogs;
  } = {}) {
    // before query logs, prune logs
    await this._pruneLogs();
    const data = await this.queryLogs({
      name: _name,
      recentTime,
      extraLogs,
    });
    if (!data) return;
    const { zip, name } = data;
    const content = await this.zipLogs(zip);
    return {
      name,
      content,
    };
  }

  /**
   * zip logs
   */
  async zipLogs(zip: JSZip) {
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    });
    return content;
  }

  /**
   * download logs in the recent time
   */
  async downloadLogs({
    name = this.name,
    recentTime = this.recentTime,
    extraLogs = [],
  }: {
    /**
     * name of the zip file
     */
    name?: string;
    /**
     * recent time of the logs
     */
    recentTime?: number;
    /**
     * extra logs
     */
    extraLogs?: ExtraLogs;
  } = {}) {
    try {
      // save current logs in memory
      await this._saveDB(true);
      await this._flushSavingLogs(true);
      const data = await this.getLogs({ name, recentTime, extraLogs });
      if (data) {
        await saveAs(data.content, `${data.name}.zip`);
      }
    } catch (error) {
      console.error(`download log error`);
      throw error;
    }
  }
}
