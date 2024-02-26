/* eslint-disable consistent-return */
/* eslint-disable import/no-mutable-exports */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Roarr as log,
  Message,
  MessageContext,
  Logger as RoarrLogger,
} from 'roarr';
import { global } from '@ringcentral/mfe-shared';

import type {
  ILogger,
  ITransport,
  IIntegration,
  IMiddlewares,
  LogTypes,
  LoggerOptions,
  ContextOptions,
} from './interface';
import { SerializeMiddlewares } from './middlewares';

export class Logger implements ILogger {
  protected _session = new Date().toISOString();

  protected _logger: RoarrLogger;

  protected _middlewares: IMiddlewares[];

  protected _integrations: IIntegration[];

  protected _transports: ITransport[];

  constructor(protected _options: LoggerOptions) {
    this._middlewares = this._options.middlewares ?? [
      new SerializeMiddlewares(),
    ];

    this._integrations = this._options.integrations ?? [];

    this._transports = this._options.transports ?? [];

    if (this._options.logger) {
      this._logger = this._options.logger;
    } else {
      this._transports.forEach((transport) => {
        transport.init({
          session: this._session,
        });
      });
      global.ROARR = global.ROARR ?? {};
      const { ROARR } = global;
      ROARR.write = (message: string) => {
        // TODO: redefine ROARR.serializeMessage for re-serialize message
        const payload = JSON.parse(message) as Message;
        this._transports.forEach((transport) => {
          transport.write({
            payload,
            message,
          });
        });
      };
      const context = this._middlewareWithContext({
        application: this._options.name,
        namespace: [this._options.name],
        options: {
          enabled: this._options.enabled ?? false,
        },
      });
      this._logger = log.child(context);
      this._integrations.forEach((integration) => {
        integration.init(this);
      });
    }
  }

  get integrations() {
    return this._integrations;
  }

  get transports() {
    return this._transports;
  }

  protected _middlewareWithContext(options: MessageContext) {
    return this._middlewares.reduce((_options, middleware) => {
      return middleware.handleContext(_options);
    }, options);
  }

  protected _middlewareWithParams(options: any[] | string) {
    return this._middlewares.reduce((_options, middleware) => {
      return middleware.handleParams(_options);
    }, options) as string;
  }

  protected _log(type: LogTypes, args: any[]) {
    if (!this.enabled) return;
    const params = this._middlewareWithParams(args);
    // @ts-ignore
    return this._logger[type].call(this._log, params);
  }

  log(...args: any[]) {
    return this._log('info', args);
  }

  trace(...args: any[]) {
    return this._log('trace', args);
  }

  debug(...args: any[]) {
    return this._log('debug', args);
  }

  info(...args: any[]) {
    return this._log('info', args);
  }

  warn(...args: any[]) {
    return this._log('warn', args);
  }

  error(...args: any[]) {
    return this._log('error', args);
  }

  fatal(...args: any[]) {
    return this._log('fatal', args);
  }

  tag(...args: string[]) {
    const context = this._middlewareWithContext({
      namespace: (this._logger.getContext().namespace as string[]).concat(args),
    });
    const logger = this._logger.child(context);
    return new Logger({
      ...this._options,
      logger,
    });
  }

  get enabled() {
    return (this._logger.getContext().options as ContextOptions).enabled;
  }

  /**
   * enable logger
   */
  enable() {
    (this._logger.getContext().options as ContextOptions).enabled = true;
  }

  /**
   * disable logger
   */
  disable() {
    (this._logger.getContext().options as ContextOptions).enabled = false;
  }
}

let logger: Logger;

const useLogger = (options: LoggerOptions) => {
  if (logger) return logger.tag(options.name);
  logger = new Logger(options);
  return logger;
};

export { useLogger, logger };
