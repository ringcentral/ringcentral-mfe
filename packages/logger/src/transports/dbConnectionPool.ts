/* eslint-disable no-console */
import Dexie from 'dexie';
import { global } from '@ringcentral/mfe-shared';

export interface DBConnectionPoolOptions {
  /**
   * Maximum number of concurrent connections per database
   */
  maxConnections?: number;
  /**
   * Connection idle timeout in milliseconds
   */
  idleTimeout?: number;
  /**
   * Enable performance monitoring
   */
  enablePerformanceMonitoring?: boolean;
}

export interface DBPerformanceMetrics {
  connectionCount: number;
  activeConnections: number;
  averageConnectionTime: number;
  totalOperations: number;
  failedOperations: number;
  queuedOperations: number;
  averageWriteTime: number;
}

interface QueuedOperation {
  resolve: (db: Dexie) => void;
  reject: (error: Error) => void;
  priority: number;
  timestamp: number;
}

interface ConnectionInfo {
  db: Dexie;
  lastUsed: number;
  inUse: boolean;
}

export class DBConnectionPool {
  private static pools = new Map<string, DBConnectionPool>();

  private connections: ConnectionInfo[] = [];

  private queue: QueuedOperation[] = [];

  private metrics: DBPerformanceMetrics = {
    connectionCount: 0,
    activeConnections: 0,
    averageConnectionTime: 0,
    totalOperations: 0,
    failedOperations: 0,
    queuedOperations: 0,
    averageWriteTime: 0,
  };

  private readonly maxConnections: number;

  private readonly idleTimeout: number;

  private readonly enablePerformanceMonitoring: boolean;

  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private dbName: string,
    private dbConfig: { version: number; stores: Record<string, string> },
    options: DBConnectionPoolOptions = {}
  ) {
    this.maxConnections = options.maxConnections ?? 2; // Conservative default
    this.idleTimeout = options.idleTimeout ?? 30000; // 30 seconds
    this.enablePerformanceMonitoring =
      options.enablePerformanceMonitoring ?? false;

    // Start cleanup timer
    this.startCleanupTimer();
  }

  static getInstance(
    dbName: string,
    dbConfig: { version: number; stores: Record<string, string> },
    options: DBConnectionPoolOptions = {}
  ): DBConnectionPool {
    if (!this.pools.has(dbName)) {
      this.pools.set(dbName, new DBConnectionPool(dbName, dbConfig, options));
    }
    return this.pools.get(dbName)!;
  }

  /**
   * Get a database connection with priority support
   */
  async getConnection(priority = 1): Promise<Dexie> {
    const startTime = performance.now();

    try {
      // Check for available connection
      const availableConnection = this.connections.find((conn) => !conn.inUse);
      if (availableConnection) {
        availableConnection.inUse = true;
        availableConnection.lastUsed = Date.now();
        this.updateMetrics(startTime, true);
        return availableConnection.db;
      }

      // Create new connection if under limit
      if (this.connections.length < this.maxConnections) {
        const db = await this.createConnection();
        const connectionInfo: ConnectionInfo = {
          db,
          lastUsed: Date.now(),
          inUse: true,
        };
        this.connections.push(connectionInfo);
        this.updateMetrics(startTime, true);
        return db;
      }

      // Queue the request
      return new Promise<Dexie>((resolve, reject) => {
        this.queue.push({
          resolve,
          reject,
          priority,
          timestamp: Date.now(),
        });

        // Sort queue by priority (lower number = higher priority)
        this.queue.sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.timestamp - b.timestamp; // FIFO for same priority
        });

        this.metrics.queuedOperations += 1;
      });
    } catch (error) {
      this.updateMetrics(startTime, false);
      throw error;
    }
  }

  /**
   * Release a database connection back to the pool
   */
  releaseConnection(db: Dexie): void {
    const connectionInfo = this.connections.find((conn) => conn.db === db);
    if (!connectionInfo) {
      console.warn('Attempting to release unknown connection');
      return;
    }

    connectionInfo.inUse = false;
    connectionInfo.lastUsed = Date.now();

    // Process queue if there are waiting operations
    if (this.queue.length > 0) {
      const nextOperation = this.queue.shift()!;
      connectionInfo.inUse = true;
      this.metrics.queuedOperations -= 1;
      nextOperation.resolve(db);
    }
  }

  /**
   * Execute a database operation with automatic connection management
   */
  async execute<T>(
    operation: (db: Dexie) => Promise<T>,
    priority = 1
  ): Promise<T> {
    const db = await this.getConnection(priority);
    try {
      const result = await operation(db);
      this.metrics.totalOperations += 1;
      return result;
    } catch (error) {
      this.metrics.failedOperations += 1;
      throw error;
    } finally {
      this.releaseConnection(db);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): DBPerformanceMetrics {
    return {
      ...this.metrics,
      connectionCount: this.connections.length,
      activeConnections: this.connections.filter((conn) => conn.inUse).length,
    };
  }

  /**
   * Close all connections and cleanup
   */
  async close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Reject all queued operations
    this.queue.forEach((op) => {
      op.reject(new Error('Connection pool is closing'));
    });
    this.queue.length = 0;

    // Close all connections
    await Promise.all(
      this.connections.map(async (conn) => {
        try {
          await conn.db.close();
        } catch (error) {
          console.warn('Error closing database connection:', error);
        }
      })
    );

    this.connections.length = 0;
    DBConnectionPool.pools.delete(this.dbName);
  }

  private async createConnection(): Promise<Dexie> {
    const db = new Dexie(this.dbName);
    db.version(this.dbConfig.version).stores(this.dbConfig.stores);

    // Add support for Chrome's Storage Buckets if available
    if (this.supportsStorageBuckets()) {
      try {
        const bucket = await this.getStorageBucket();
        if (bucket) {
          // Use storage bucket for better isolation
          // Note: This would require Dexie to support storage buckets
          // For now, we just log the availability
          console.debug('Storage Buckets available for', this.dbName);
        }
      } catch (error) {
        console.debug('Storage Buckets not available:', error);
      }
    }

    await db.open();
    return db;
  }

  private supportsStorageBuckets(): boolean {
    return 'navigator' in global && 'storageBuckets' in navigator;
  }

  private async getStorageBucket() {
    if (!this.supportsStorageBuckets()) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Storage Buckets API is experimental
      const buckets = navigator.storageBuckets;
      return await buckets.open(this.dbName);
    } catch (error) {
      console.debug('Failed to open storage bucket:', error);
      return null;
    }
  }

  private updateMetrics(startTime: number, success: boolean): void {
    if (!this.enablePerformanceMonitoring) return;

    const duration = performance.now() - startTime;
    this.metrics.averageConnectionTime =
      (this.metrics.averageConnectionTime * this.metrics.totalOperations +
        duration) /
      (this.metrics.totalOperations + 1);

    if (!success) {
      this.metrics.failedOperations += 1;
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.idleTimeout);
  }

  private cleanupIdleConnections(): void {
    const now = Date.now();
    const connectionsToRemove: number[] = [];

    this.connections.forEach((conn, index) => {
      if (!conn.inUse && now - conn.lastUsed > this.idleTimeout) {
        connectionsToRemove.push(index);
      }
    });

    // Remove idle connections (keep at least one if no queue)
    const minConnections = this.queue.length > 0 ? 0 : 1;
    const maxToRemove = this.connections.length - minConnections;

    connectionsToRemove.slice(0, maxToRemove).forEach((index) => {
      const conn = this.connections[index];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      conn.db.close().catch((error: Error) => {
        console.warn('Error closing idle connection:', error);
      });
    });

    if (connectionsToRemove.length > 0) {
      this.connections = this.connections.filter(
        (_, index) => !connectionsToRemove.slice(0, maxToRemove).includes(index)
      );
    }
  }
}
