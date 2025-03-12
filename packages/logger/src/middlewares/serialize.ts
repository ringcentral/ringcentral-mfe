import type { MessageContext } from 'roarr';
import { serializeError } from 'serialize-error';
import { stringify } from 'safe-stable-stringify';

import type { IMiddlewares } from '../interface';

export class SerializeMiddlewares implements IMiddlewares {
  handleContext(messageContext: MessageContext) {
    return messageContext;
  }

  handleParams(params: any[]) {
    const arr = params.map((item) =>
      item instanceof Error ? serializeError(item) : item
    );
    try {
      return stringify(arr).slice(1, -1);
    } catch (e) {
      console.error(e);
      return Array.isArray(arr) && typeof arr[0] === 'string'
        ? `['${arr[0]}', 'non-serializable data']`
        : 'non-serializable data';
    }
  }
}
