/* eslint-disable no-console */
/* eslint-disable prefer-rest-params */
import type { IIntegration, ILogger, ITransport } from '../interface';

const DEFAULT_CAPTURED_METHODS = [
  'log',
  'info',
  'warn',
  'error',
  'debug',
] as const;

export class ConsoleIntegration implements IIntegration {
  type = 'console';

  constructor(
    protected _options?: {
      enabled?: boolean;
      capturedMethods?: (typeof DEFAULT_CAPTURED_METHODS)[number][];
    }
  ) {
    if (this._options?.enabled) {
      this.capturedMethods.forEach((method) => {
        const originalMethod = (console as any)[method];
        (console as any)[method] = (...args: any[]) => {
          if (this._logger?.enabled === false) {
            originalMethod.apply(console, args);
            return;
          }
          // if the log is from the logger itself, don't log it again.
          if (args[4]?.application) return;
          this._logger?.[method]?.(args);
          // if the console transport is disabled, don't log it with native console logger again.
          if (this._consoleTransport) return;
          originalMethod.apply(console, args);
        };
      });
    }
  }

  get capturedMethods() {
    return this._options?.capturedMethods ?? DEFAULT_CAPTURED_METHODS;
  }

  protected _logger?: ILogger;

  protected _consoleTransport?: ITransport;

  init(logger: ILogger) {
    this._logger = logger;
    this._consoleTransport = this._logger?.transports.find(
      (transport) => transport.type === 'console'
    );
  }
}
