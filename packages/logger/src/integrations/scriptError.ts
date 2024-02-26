import { global } from '@ringcentral/mfe-shared';
import type { IIntegration, ILogger } from '../interface';

export class ScriptErrorIntegration implements IIntegration {
  type = 'scriptError';

  constructor(
    protected _options?: {
      enabled?: boolean;
    }
  ) {}

  init(logger: ILogger) {
    if (this._options?.enabled) {
      global.addEventListener(
        'unhandledrejection',
        (e) => {
          logger.error(`${e.type}: ${e.reason?.stack?.toString()}`);
        },
        true
      );
      global.addEventListener(
        'error',
        (err) => {
          logger.error(
            `${err.type}: ${err.error?.stack?.toString() ?? err.message}`
          );
        },
        true
      );
    }
  }
}
