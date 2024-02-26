import { messageSW } from 'workbox-window';
import { EventResponse, buildEventData } from '../shared/messageEventProtocol';
import { deserializeError } from '../shared/serialize-utils';

class MessageClient {
  constructor(private _getSw: () => Promise<ServiceWorker>) {}

  async invoke<T, R>(eventName: string, payload: T): Promise<R> {
    const response = (await messageSW(
      await this._getSw(),
      buildEventData(eventName, payload)
    )) as EventResponse<R>;

    if (response.isError) {
      throw deserializeError(response.error);
    }
    return response.data;
  }
}

export { MessageClient };
