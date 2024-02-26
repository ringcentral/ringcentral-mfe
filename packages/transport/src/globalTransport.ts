/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */
/* eslint-disable no-use-before-define */
/* eslint-disable no-shadow */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import {
  ListenerOptions,
  Transport as BaseTransport,
  TransportOptions as BaseTransportOptions,
  senderKey,
  verboseKey,
  logKey,
  BaseInteraction,
} from 'data-transport';
import { global } from '@ringcentral/mfe-shared';
import { broadcastMessage, hasParentMFE } from './postMessage';
import type { SendOptions } from './interface';

interface GlobalTransportOptions extends Partial<BaseTransportOptions> {
  /**
   * Specify what the origin of targetWindow must be for the event to be dispatched,
   * by default, it's the literal string "*" (indicating no preference).
   */
  targetOrigin?: string;
  /**
   * Specify a scope for the global transport, by default, it's '*'
   */
  scope?: string;
}

const DEFAULT_TARGET_ORIGIN = '*';
const DEFAULT_TARGET_SCOPE = '*';
const DEFAULT_PREFIX = 'GlobalDataTransport';

export const createScopeName = (id: string, scope = DEFAULT_TARGET_SCOPE) =>
  `${id}:${scope}`;

const getIframeScope = (scope: string) => new RegExp(`:\\${scope}$`);
export class GlobalTransport<
  T extends BaseInteraction = {}
> extends BaseTransport<T> {
  protected targetOrigin: string;

  protected targetScope: string;

  protected isGlobalTransport: (string: string) => boolean;

  constructor({
    scope = DEFAULT_TARGET_SCOPE,
    targetOrigin = DEFAULT_TARGET_ORIGIN,
    prefix = DEFAULT_PREFIX,
    listener = function listener(this: GlobalTransport, callback) {
      const handler = ({
        data,
        source,
      }: MessageEvent<ListenerOptions & { scope?: string }>) => {
        if (!data || (!data.action && !this.isGlobalTransport(data.action)))
          return;
        if (data.scope === this.targetScope) {
          callback(data);
        }
        const scope = getIframeScope(this.targetScope);
        broadcastMessage({
          data,
          origin: this.targetOrigin,
          source,
          scope,
        });
      };
      global.addEventListener('message', handler);
      return () => {
        global.removeEventListener('message', handler);
      };
    },
    sender = function sender(this: GlobalTransport, message: SendOptions) {
      message.scope = this.targetScope;
      const scope = getIframeScope(this.targetScope);
      if (hasParentMFE(scope)) {
        global.parent.postMessage(message, this.targetOrigin);
      } else {
        global.postMessage(message, this.targetOrigin);
      }
    },
    checkListen = false,
    serializer = {
      stringify: JSON.stringify,
      parse: JSON.parse,
    },
    ...options
  }: GlobalTransportOptions) {
    super({
      ...options,
      prefix,
      checkListen,
      listener,
      sender,
      serializer,
    });
    const regExp = new RegExp(`^${prefix}`);
    this.isGlobalTransport = (str: string) => regExp.test(str);
    this.targetOrigin = targetOrigin;
    this.targetScope = scope;

    const _sender = this[senderKey];

    this[senderKey] = (data: SendOptions) => {
      if (data.type === 'response') {
        // reset the downward flag with response message
        delete data.downward;
      }
      _sender(data);
    };
    const { dispose } = this;
    this.dispose = () => {
      dispose();
      this.eventListeners = new Map();
    };
  }

  private eventListeners = new Map<string, Set<(...args: any) => any>>();

  /**
   * Set the target origin
   */
  setOrigin(targetOrigin: string) {
    this.targetOrigin = targetOrigin;
  }

  /**
   * Set verbose mode
   */
  setVerbose(value: boolean) {
    this[verboseKey] = value;
  }

  /**
   * Set a custom logger
   */
  setLogger(logger: (data: SendOptions) => void) {
    this[logKey] = logger;
  }

  /**
   * Set the target scope
   */
  setScope(scope: string) {
    this.targetScope = scope;
  }

  /**
   * Listen an event that transport data.
   *
   * @param name A transport action as listen message data action type
   * @param fn A transport listener
   */
  listen<K extends keyof T['listen']>(name: K, fn: T['listen'][K]) {
    const eventListeners = this.eventListeners.get(name as string) ?? new Set();
    if (eventListeners.size === 0) {
      const callback = super.listen(name, ((...args: any[]) => {
        return Promise.race(
          Array.from(eventListeners)
            .slice(1)
            .map((fn) => fn(...args))
        );
      }) as T['listen'][K]);
      eventListeners.add(callback as (...args: any) => any);
    }
    eventListeners.add(fn as (...args: any) => any);
    this.eventListeners.set(name as string, eventListeners);
    return () => {
      eventListeners.delete(fn as (...args: any) => any);
      if (eventListeners.size === 1) {
        eventListeners.values().next().value();
        eventListeners.clear();
      }
    };
  }
}

global.__RC_TRANSPORT__ = global.__RC_TRANSPORT__ ?? new GlobalTransport({});

export const globalTransport: GlobalTransport = global.__RC_TRANSPORT__;

export const getGlobalTransport = <T extends BaseInteraction = {}>() =>
  globalTransport as GlobalTransport<T>;
