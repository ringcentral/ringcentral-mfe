import type { MessageContext } from 'roarr';
import { serializeError } from 'serialize-error';
import { stringify } from 'safe-stable-stringify';

import type { IMiddlewares } from '../interface';

export class SerializeMiddlewares implements IMiddlewares {
  handleContext(messageContext: MessageContext) {
    return messageContext;
  }

  handleParams(params: any[]) {
    let arr: any[] = [];
    try {
      arr = params.map((item) =>
        item instanceof Error ? serializeError(item) : item
      );
      return stringify(arr);
    } catch (e) {
      console.trace(e);
      return typeof arr[0] === 'string'
        ? `['${arr[0]}', 'non-serializable data']`
        : 'non-serializable data';
    }
  }
}
