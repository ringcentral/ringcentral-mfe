import { createLogWriter } from '@roarr/browser-log-writer';
import { global } from '@ringcentral/mfe-shared';
import { type LogWriter } from 'roarr';

import type {
  ITransport,
  SerializedMessage,
  TransportInitOptions,
  Storage,
} from '../interface';

export class ConsoleTransport implements ITransport {
  type = 'console';

  protected _consoleWrite: LogWriter;

  constructor(
    protected _options?: {
      enabled?: boolean;
      filter?: string;
      storage?: Storage;
    }
  ) {
    this._consoleWrite = createLogWriter({
      storage: this._options?.storage,
    });
  }

  protected get _storage() {
    return this._options?.storage ?? global.localStorage;
  }

  init(options: TransportInitOptions) {
    if (this._options?.enabled) {
      this._storage.setItem('ROARR_LOG', 'true');
    }
    if (this._options?.filter) {
      this.setFilter(this._options.filter);
    }
  }

  enable() {
    this._storage.setItem('ROARR_LOG', 'true');
  }

  disable() {
    this._storage.removeItem('ROARR_LOG');
  }

  write({ message }: SerializedMessage) {
    if (this._options?.enabled) {
      this._consoleWrite(message);
    }
  }

  /**
   * By default all logs are displayed.
   * you can set a filter query with [Liqe](https://github.com/gajus/liqe).
   */
  setFilter(query: string) {
    this._storage.setItem('ROARR_FILTER', query);
  }
}
