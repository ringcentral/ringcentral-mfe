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

  protected _ignoreRules: RegExp[] = [];

  constructor(
    protected _options?: {
      /**
       * By default the console transport is disabled.
       */
      enabled?: boolean;
      /**
       * By default all logs are displayed.
       */
      filter?: string;
      /**
       * The storage to save the log.
       */
      storage?: Storage;
      /**
       * Ignore logs that match the rules.
       */
      ignoreRule?: (string | RegExp)[];
    }
  ) {
    this._consoleWrite = createLogWriter({
      storage: this._options?.storage,
    });
    this._ignoreRules = (this._options?.ignoreRule ?? []).map((rule) =>
      rule instanceof RegExp ? rule : new RegExp(rule)
    );
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
    if (this._ignoreRules.some((regex) => regex.test(message))) return;
    if (this._options?.enabled) {
      const messageObj = JSON.parse(message);
      delete messageObj.context.application;
      delete messageObj.context.options;
      this._consoleWrite(JSON.stringify(messageObj));
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
