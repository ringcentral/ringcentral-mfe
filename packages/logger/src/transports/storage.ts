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

interface Logs {
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

  constructor(protected _options: StorageTransportOptions = {}) {}

  async init({ session }: TransportInitOptions) {
    this._session = session;
    this._data.session = session;
    // TODO: refactor this with teardown
    if (this._options.enabled) {
      this._initDB().catch((err) => {
        console.error('StorageTransport.initDB:', err);
      });
      this._onUnload();
      if (global.localStorage) {
        const key = `${this._tempKey}-prune-time`;
        const PrunedTime = global.localStorage.getItem(key);
        if (PrunedTime !== new Date().toLocaleDateString()) {
          this._pruneLogs();
          global.localStorage.setItem(key, new Date().toLocaleDateString());
        }
      }
      setInterval(() => {
        this._pruneLogs();
      }, this.expiredTime);
    }
  }

  protected _onUnload() {
    if (global.localStorage) {
      const tempLogs = global.localStorage.getItem(this._tempKey);
      if (tempLogs) {
        global.localStorage.removeItem(this._tempKey);
        const logs = JSON.parse(tempLogs) as Logs[];
        logs.forEach((data) => {
          this._saveLogs(data);
        });
      }
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
    }
  }

  protected get _tempKey() {
    return `${this.name}-temp`;
  }

  get options() {
    return this._options;
  }

  get name() {
    return `${this._options.prefix ?? 'rc-mfe'}-log`;
  }

  protected async _initDB() {
    const db = new Dexie(this.name);
    db.version(this._options.version ?? 1).stores({
      logs: '&time',
    });
    this._table = db.table('logs');
    db.open().catch((err) => {
      console.error(`StorageTransport.initDB:`, err);
    });
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

  protected _timeout: NodeJS.Timeout | null = null;

  write({ payload }: SerializedMessage) {
    if (this._options.enabled) {
      const message = this._stringify(payload);
      this._data.size += message.length;
      this._data.messages.push(message);
      if (this._data.size > this.batchSize) {
        this._saveDB();
      } else if (!this._timeout) {
        this._timeout = setTimeout(() => {
          this._saveDB();
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
    await this._saveDB();
    await this._pruneLogs();
  }

  protected _saveDB() {
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
    return this._saveLogs(data);
  }

  /**
   * saving logs promise
   */
  savingLogsPromise?: Promise<void>;

  protected _savingLogs = new Set<Logs>();

  protected async _checkTimeKey(time: number): Promise<number> {
    // Ensure time is a valid number - Dexie requires proper number type
    const validTime = Number(time);
    if (Number.isNaN(validTime)) {
      return Date.now(); // Fallback to current timestamp if invalid
    }

    try {
      const count = await this._table?.where('time').equals(validTime).count();
      if (count) {
        return this._checkTimeKey(validTime + 1);
      }
      return validTime;
    } catch (error) {
      console.error('Error in _checkTimeKey:', error);
      return validTime + 1; // Move to next time value in case of error
    }
  }

  protected async _saveLogs(data: Logs) {
    this._savingLogs.add(data);
    data.time = await this._checkTimeKey(data.time);
    const savingLogsPromise = this._table?.add(data).then(() => {
      this._savingLogs.delete(data);
      if (this.savingLogsPromise === savingLogsPromise) {
        this.savingLogsPromise = undefined;
      }
    });
    if (this.savingLogsPromise) {
      const _saveLogsPromise = this.savingLogsPromise;
      const nextSaveLogsPromise = Promise.all([
        savingLogsPromise,
        _saveLogsPromise,
      ]).then(() => {
        if (this.savingLogsPromise === nextSaveLogsPromise) {
          this.savingLogsPromise = undefined;
        }
      });
      this.savingLogsPromise = nextSaveLogsPromise;
      return nextSaveLogsPromise;
    }
    this.savingLogsPromise = savingLogsPromise;
    return savingLogsPromise;
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

  protected async _pruneLogs() {
    await this._deleteExpiredLogs();
    const logs = (await this._getLogs()) ?? [];
    let totalSize = 0;
    for (const log of logs) {
      totalSize += log.size;
      if (totalSize > this.maxLogsSize) {
        await this._deleteLogs(log.time);
        break;
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
    const allSessions = new Set<string>();

    // Collect all valid sessions
    allLogs.forEach((log) => {
      if (log.session) {
        allSessions.add(log.session);
      }
    });

    // Get recent logs by time
    const data =
      (await this._table
        ?.where('time')
        .above(Date.now() - recentTime)
        .toArray()) ?? [];

    if (!data.length) return;

    data.sort((a, b) => a.time - b.time);

    const endTime = new Date(data[data.length - 1].time).toISOString();
    const startTime = new Date(data[0].time).toISOString();
    const name = `${_name}_${startTime}_${endTime}`;
    const logs = data.map((item) => item.messages.join('\n')).join('\n');
    const zip = new JSZip();
    const logFolder = zip.folder(name)!;
    logFolder.file('recent.log', `${logs}\n`);
    const historyFolder = logFolder.folder('history')!;

    // Process each session
    for (const session of allSessions) {
      const sessionLogs = allLogs
        .filter((log) => log.session === session)
        .sort((a, b) => a.time - b.time)
        .map((item) => item.messages.join('\n'))
        .join('\n');
      historyFolder.file(`${session}.log`, `${sessionLogs}\n`);
    }

    for (const extraLog of extraLogs) {
      // Append a newline for string logs to ensure proper text formatting.
      // Binary data is treated as raw data and does not require a newline.
      if (typeof extraLog.log === 'string') {
        zip.file(extraLog.fileName, `${extraLog.log}\n`);
      } else {
        zip.file(extraLog.fileName, extraLog.log);
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
      await this._saveDB();
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
