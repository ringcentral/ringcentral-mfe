import type { SendOptions as ISendOptions } from 'data-transport';
import type { GlobalTransport } from './globalTransport';

export interface SendOptions extends ISendOptions {
  /**
   * downward message
   */
  downward?: boolean;
  /**
   * scope of message
   */
  scope?: string;
}

type ListenerRecord<T extends { transport: GlobalTransport }> =
  T['transport'] extends GlobalTransport<infer L> ? L : never;

export type PickListeners<T extends { transport?: GlobalTransport }> =
  ListenerRecord<{
    transport: Exclude<T['transport'], undefined>;
  }>;
