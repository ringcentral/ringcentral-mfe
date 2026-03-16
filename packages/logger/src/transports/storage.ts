/* eslint-disable no-console */
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
import {
  DBConnectionPool,
  type DBConnectionPoolOptions,
  type DBPerformanceMetrics,
} from './dbConnectionPool';

const DEFAULT_BATCH_SIZE = 1024 * 512; // 512KB
const DEFAULT_MAX_LOGS_SIZE = 1024 * 1024 * 100; // 100MB
const DEFAULT_BATCH_TIMEOUT = 1000 * 60 * 5; // 5 minutes
const DEFAULT_EXPIRED_TIME = 1000 * 60 * 60 * 24; // 1 day
const DEFAULT_RECENT_TIME = 1000 * 60 * 60; // 1 hour
const DEFAULT_LAZY_INIT_DELAY = 2000; // 2 seconds delay for lazy initialization

export interface Logs {
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

export enum LogPriority {
  HIGH = 0,
  NORMAL = 1,
  LOW = 2,
}

export interface StorageTransportOptions {
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
   * lazy initialization delay in milliseconds
   */
  lazyInitDelay?: number;
  /**
   * connection pool options
   */
  connectionPool?: DBConnectionPoolOptions;
  /**
   * transaction durability mode ('strict' | 'relaxed')
   * relaxed mode provides better performance but less durability guarantee
   */
  durabilityMode?: 'strict' | 'relaxed';
  /**
   * enable performance monitoring
   */
  enablePerformanceMonitoring?: boolean;
  /**
   * custom priority for different log levels
   */
  logLevelPriority?: Partial<
    Record<'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal', LogPriority>
  >;
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

interface QueuedWrite {
  data: Logs;
  priority: LogPriority;
  timestamp: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

export class StorageTransport implements ITransport {
  type = 'storage';

  protected _connectionPool?: DBConnectionPool;

  protected _session?: string;

  protected _initialized = false;

  protected _initializing = false;

  protected _writeQueue: QueuedWrite[] = [];

  protected _isProcessingQueue = false;

  protected _data: Logs = {
    time: Date.now(),
    size: 0,
    messages: [],
  };

  protected _timeout: NodeJS.Timeout | null = null;

  protected _lazyInitTimeout: NodeJS.Timeout | null = null;

  // Performance monitoring
  protected _performanceMetrics = {
    totalWrites: 0,
    totalWriteTime: 0,
    batchCount: 0,
    queuedOperations: 0,
    errors: 0,
  };

  constructor(protected _options: StorageTransportOptions = {}) {}

  async init({ session }: TransportInitOptions) {
    this._session = session;
    this._data.session = session;

    if (!this._options.enabled) return;

    // Implement lazy initialization to reduce startup I/O pressure
    const lazyDelay = this._options.lazyInitDelay ?? DEFAULT_LAZY_INIT_DELAY;

    if (lazyDelay > 0) {
      this._lazyInitTimeout = setTimeout(() => {
        this._initializeDB().catch((err) => {
          console.error('StorageTransport.lazyInit:', err);
        });
      }, lazyDelay);
    } else {
      await this._initializeDB();
    }

    this._setupUnloadHandler();
    this._setupPeriodicCleanup();
  }

  protected async _initializeDB() {
    if (this._initialized || this._initializing) return;
    this._initializing = true;

    try {
      // Initialize connection pool
      this._connectionPool = DBConnectionPool.getInstance(
        this.name,
        {
          version: this._options.version ?? 1,
          stores: { logs: '&time, size' },
        },
        {
          maxConnections: 2, // Conservative limit as recommended in the document
          enablePerformanceMonitoring:
            this._options.enablePerformanceMonitoring ?? false,
          ...this._options.connectionPool,
        }
      );

      this._initialized = true;
      console.debug(`StorageTransport initialized for ${this.name}`);
    } catch (error) {
      console.error('Failed to initialize StorageTransport:', error);
      this._performanceMetrics.errors++;
    } finally {
      this._initializing = false;
    }
  }

  protected _setupUnloadHandler() {
    if (!global.localStorage) return;

    // Restore any temporary logs from previous session
    const tempLogs = global.localStorage.getItem(this._tempKey);
    if (tempLogs) {
      global.localStorage.removeItem(this._tempKey);
      try {
        const logs = JSON.parse(tempLogs) as Logs[];
        logs.forEach((data) => {
          this._queueWrite(data, LogPriority.HIGH); // High priority for restored logs
        });
      } catch (error) {
        console.warn('Failed to restore temporary logs:', error);
      }
    }

    // Save current state on page unload
    window.addEventListener('beforeunload', () => {
      this._saveTemporaryState();
    });
  }

  protected _setupPeriodicCleanup() {
    if (!global.localStorage) return;

    const key = `${this._tempKey}-prune-time`;
    const lastPrunedDate = global.localStorage.getItem(key);

    if (lastPrunedDate !== new Date().toLocaleDateString()) {
      // Delay cleanup to avoid startup I/O pressure
      setTimeout(() => {
        this._pruneLogs(LogPriority.LOW);
        global.localStorage.setItem(key, new Date().toLocaleDateString());
      }, 10 * 1000); // 10 seconds delay
    }

    // Set up periodic cleanup
    setInterval(() => {
      this._pruneLogs(LogPriority.LOW);
    }, this.expiredTime);
  }

  protected _saveTemporaryState() {
    if (!global.localStorage) return;

    const saveData: Logs[] = [];

    // Save current unsaved logs
    if (this._data.messages.length) {
      saveData.push({ ...this._data });
    }

    // Save queued writes
    this._writeQueue.forEach(({ data }) => {
      saveData.push(data);
    });

    if (saveData.length) {
      try {
        global.localStorage.setItem(this._tempKey, stringify(saveData));
      } catch (error) {
        console.warn('Failed to save temporary state:', error);
      }
    }
  }

  get options() {
    return this._options;
  }

  get name() {
    return `${this._options.prefix ?? 'rc-mfe'}:log`;
  }

  protected get _tempKey() {
    return `${this.name}-temp`;
  }

  get batchSize() {
    return this._options.batchNumber ?? DEFAULT_BATCH_SIZE;
  }

  get batchTimeout() {
    return this._options.batchTimeout ?? DEFAULT_BATCH_TIMEOUT;
  }

  get expiredTime() {
    return this._options.expired ?? DEFAULT_EXPIRED_TIME;
  }

  get maxLogsSize() {
    return this._options.maxLogsSize ?? DEFAULT_MAX_LOGS_SIZE;
  }

  get recentTime() {
    return this._options.recentTime ?? DEFAULT_RECENT_TIME;
  }

  protected _getLogPriority(payload: Message): LogPriority {
    const logLevel = getLogLevelName(
      payload.context.logLevel as number
    ).toLowerCase() as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

    const customPriority = this._options.logLevelPriority?.[logLevel];
    if (customPriority !== undefined) {
      return customPriority;
    }

    // Default priority mapping
    switch (logLevel) {
      case 'error':
      case 'fatal':
        return LogPriority.HIGH;
      case 'warn':
        return LogPriority.NORMAL;
      default:
        return LogPriority.LOW;
    }
  }

  write({ payload }: SerializedMessage) {
    if (!this._options.enabled) return;

    const message = this._stringify(payload);
    const priority = this._getLogPriority(payload);

    this._data.size += message.length;
    this._data.messages.push(message);

    // Trigger batch save based on size or timeout
    if (this._data.size > this.batchSize) {
      this._saveCurrentBatch(priority);
    } else if (!this._timeout) {
      this._timeout = setTimeout(() => {
        this._saveCurrentBatch(priority);
      }, this.batchTimeout);
    }
  }

  protected _saveCurrentBatch(priority: LogPriority) {
    clearTimeout(this._timeout!);
    this._timeout = null;

    const data = { ...this._data };
    this._data = {
      time: Date.now(),
      size: 0,
      messages: [],
      session: this._session!,
    };

    if (data.messages.length === 0) return;

    this._queueWrite(data, priority);
  }

  protected _queueWrite(data: Logs, priority: LogPriority) {
    return new Promise<void>((resolve, reject) => {
      this._writeQueue.push({
        data,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
      });

      // Sort queue by priority
      this._writeQueue.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return a.timestamp - b.timestamp;
      });

      this._performanceMetrics.queuedOperations += 1;
      this._processWriteQueue();
    });
  }

  protected async _processWriteQueue() {
    if (this._isProcessingQueue || this._writeQueue.length === 0) return;
    if (!this._initialized) {
      await this._initializeDB();
    }
    if (!this._connectionPool) return;

    this._isProcessingQueue = true;

    try {
      while (this._writeQueue.length > 0) {
        const write = this._writeQueue.shift()!;
        this._performanceMetrics.queuedOperations -= 1;

        try {
          await this._writeToDatabase(write.data, write.priority);
          write.resolve();
          this._performanceMetrics.batchCount += 1;
        } catch (error) {
          write.reject(error as Error);
          this._performanceMetrics.errors += 1;
        }
      }
    } finally {
      this._isProcessingQueue = false;
    }
  }

  protected async _writeToDatabase(
    data: Logs,
    priority: LogPriority
  ): Promise<void> {
    if (!this._connectionPool) throw new Error('Database not initialized');

    const startTime = performance.now();

    try {
      await this._connectionPool.execute(async (db) => {
        const table = db.table('logs');

        // Ensure unique time key
        data.time = await this._ensureUniqueTimeKey(table, data.time);

        // Use transaction with durability mode if supported
        const transaction = db.transaction('rw', table, async () => {
          await table.add(data);
        });

        // Set durability mode if supported (Chrome 121+)
        if (this._options.durabilityMode && 'durability' in transaction) {
          try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - durability is experimental
            transaction.durability = this._options.durabilityMode;
          } catch (error) {
            console.debug('Durability mode not supported:', error);
          }
        }

        await transaction;
      }, priority);

      // Update performance metrics
      if (this._options.enablePerformanceMonitoring) {
        const duration = performance.now() - startTime;
        this._performanceMetrics.totalWrites += 1;
        this._performanceMetrics.totalWriteTime += duration;
      }
    } catch (error) {
      console.error('Failed to write to database:', error);
      throw error;
    }
  }

  protected async _ensureUniqueTimeKey(
    table: Dexie.Table,
    time: number
  ): Promise<number> {
    const count = await table.where('time').equals(time).count();
    if (count > 0) {
      return this._ensureUniqueTimeKey(table, time + 1);
    }
    return time;
  }

  protected _stringify(payload: Message): string {
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
   * Force save current batch and prune logs
   */
  async saveDB() {
    this._saveCurrentBatch(LogPriority.NORMAL);
    await this._processWriteQueue();
    await this._pruneLogs(LogPriority.NORMAL);
  }

  protected async _pruneLogs(priority: LogPriority = LogPriority.LOW) {
    if (!this._connectionPool) return;

    try {
      await this._connectionPool.execute(async (db) => {
        const table = db.table('logs');

        // Delete expired logs
        const expiredTime = Date.now() - this.expiredTime;
        await table.where('time').below(expiredTime).delete();

        // Prune by size if necessary
        const allLogs = await table.orderBy('time').reverse().toArray();
        const totalSize = allLogs.reduce((sum, log) => sum + log.size, 0);

        if (totalSize > this.maxLogsSize) {
          let cutoffTime = 0;
          let sizeToKeep = this.maxLogsSize;

          for (const log of allLogs) {
            sizeToKeep -= log.size;
            if (sizeToKeep <= 0) {
              cutoffTime = log.time;
              break;
            }
          }

          if (cutoffTime > 0) {
            await table.where('time').below(cutoffTime).delete();
          }
        }
      }, priority);
    } catch (error) {
      console.error('Failed to prune logs:', error);
      this._performanceMetrics.errors += 1;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): DBPerformanceMetrics &
    typeof this._performanceMetrics {
    const dbMetrics = this._connectionPool?.getMetrics() ?? {
      connectionCount: 0,
      activeConnections: 0,
      averageConnectionTime: 0,
      totalOperations: 0,
      failedOperations: 0,
      queuedOperations: 0,
    };

    return {
      ...dbMetrics,
      ...this._performanceMetrics,
      averageWriteTime:
        this._performanceMetrics.totalWrites > 0
          ? this._performanceMetrics.totalWriteTime /
            this._performanceMetrics.totalWrites
          : 0,
    };
  }

  /**
   * Query logs in the recent time
   */
  async queryLogs({
    name: _name = this.name,
    recentTime = this.recentTime,
    extraLogs = [],
  }: {
    name?: string;
    recentTime?: number;
    extraLogs?: ExtraLogs;
  } = {}) {
    if (!this._connectionPool) {
      await this._initializeDB();
    }
    if (!this._connectionPool) return;

    return this._connectionPool.execute(async (db) => {
      const table = db.table('logs');
      const allLogs = await table.orderBy('time').toArray();
      const allSessions = new Set(allLogs.map((log) => log.session));

      const recentLogs = await table
        .where('time')
        .above(Date.now() - recentTime)
        .sortBy('time');

      if (!recentLogs.length) return;

      const endTime = new Date(
        recentLogs[recentLogs.length - 1].time
      ).toISOString();
      const startTime = new Date(recentLogs[0].time).toISOString();
      const name = `${_name}_${startTime}_${endTime}`;
      const logs = recentLogs
        .map((item) => item.messages.join('\n'))
        .join('\n');

      const zip = new JSZip();
      const logFolder = zip.folder(name)!;
      logFolder.file('recent.log', `${logs}\n`);

      const historyFolder = logFolder.folder('history')!;
      for (const session of allSessions) {
        const sessionLogs = allLogs
          .filter((log) => log.session === session)
          .map((item) => item.messages.join('\n'))
          .join('\n');
        historyFolder.file(`${session}.log`, `${sessionLogs}\n`);
      }

      for (const extraLog of extraLogs) {
        if (typeof extraLog.log === 'string') {
          zip.file(extraLog.fileName, `${extraLog.log}\n`);
        } else {
          zip.file(extraLog.fileName, extraLog.log);
        }
      }

      return { name, zip };
    }, LogPriority.NORMAL);
  }

  /**
   * Get logs in the recent time
   */
  async getLogs(options: Parameters<typeof this.queryLogs>[0] = {}) {
    await this._pruneLogs(LogPriority.NORMAL);
    const data = await this.queryLogs(options);
    if (!data) return;

    const { zip, name } = data;
    const content = await this.zipLogs(zip);
    return { name, content };
  }

  /**
   * Zip logs
   */
  async zipLogs(zip: JSZip) {
    return zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9,
      },
    });
  }

  /**
   * Download logs
   */
  async downloadLogs(options: Parameters<typeof this.getLogs>[0] = {}) {
    try {
      await this.saveDB();
      const data = await this.getLogs(options);
      if (data) {
        await saveAs(data.content, `${data.name}.zip`);
      }
    } catch (error) {
      console.error('Download log error:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async dispose() {
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    if (this._lazyInitTimeout) {
      clearTimeout(this._lazyInitTimeout);
    }

    // Process remaining queue
    await this._processWriteQueue();

    // Save temporary state
    this._saveTemporaryState();

    if (this._connectionPool) {
      await this._connectionPool.close();
    }
  }
}
