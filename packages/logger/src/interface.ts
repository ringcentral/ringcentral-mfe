/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { Logger as RoarrLogger, Message, MessageContext } from 'roarr';

type LogMethod = (...args: any) => void;

export type LogTypes =
  | 'log'
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal';

export interface ILogger extends Record<LogTypes, LogMethod> {
  integrations: IIntegration[];
  transports: ITransport[];
  enabled: boolean;
}

export type SerializedMessage = {
  payload: Message;
  message: string;
};

export interface TransportInitOptions {
  session: string;
}

export interface ITransport {
  /**
   * transport type
   */
  type: string;
  /**
   * enable transport
   */
  init: (options: TransportInitOptions) => void | Promise<void>;
  /**
   * write log
   */
  write(message: SerializedMessage): void;
}

export interface IMiddlewares {
  /**
   * handle context before create logger
   */
  handleContext(messageContext: MessageContext): MessageContext;
  /**
   * handle params before write log
   */
  handleParams(params: any[] | string): string;
}

export interface IIntegration {
  /**
   * transport type
   */
  type: string;
  /**
   * init integration
   */
  init(logger: ILogger): void;
}

export interface LoggerOptions {
  /**
   * logger name of application
   */
  name: string;
  /**
   * logger version
   */
  version?: string;
  /**
   * logger environment
   */
  environment?: string;
  /**
   * logger middlewares
   */
  integrations?: IIntegration[];
  /**
   * logger middlewares
   */
  transports?: ITransport[];
  /**
   * logger middlewares
   */
  middlewares?: IMiddlewares[];
  /**
   * roarr logger
   */
  logger?: RoarrLogger;
  /**
   * enable logger
   */
  enabled?: boolean;
}

export type ContextOptions = {
  /**
   * enable logger
   */
  enabled: boolean;
};

export type { RoarrLogger };

export interface Storage {
  /**
   * get item from storage
   */
  getItem(key: string): string | null;
  /**
   * set item to storage
   */
  setItem(key: string, value: string): void;
  /**
   * remove item from storage
   */
  removeItem(key: string): void;
}
