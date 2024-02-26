import {
  buildErrorResponse,
  buildResponse,
  isEvent,
} from '../shared/messageEventProtocol';

declare const self: ServiceWorkerGlobalScope;
type Dispose = () => void;

export const handleClientEvent = <Payload, Response>(
  eventName: string,
  handler: (payload: Payload) => Promise<Response> | Response
): Dispose => {
  const wrapHandler = (event: ExtendableMessageEvent) => {
    if (isEvent<Payload>(eventName, event.data)) {
      try {
        const result = handler(event.data.payload);
        if (result instanceof Promise) {
          result
            .then((response) => {
              event.ports[0].postMessage(buildResponse(response));
            })
            .catch((error) => {
              event.ports[0].postMessage(buildErrorResponse(error as Error));
            });
        } else {
          event.ports[0].postMessage(buildResponse(result));
        }
      } catch (error) {
        event.ports[0].postMessage(buildErrorResponse(error as Error));
      }
    }
  };
  self.addEventListener('message', wrapHandler);
  return () => {
    self.removeEventListener('message', wrapHandler);
  };
};
