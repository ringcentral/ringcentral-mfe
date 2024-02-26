import type { MessageContext } from 'roarr';
import { serializeError } from 'serialize-error';
import { stringify } from 'safe-stable-stringify';

import type { IMiddlewares } from '../interface';

export class SerializeMiddlewares implements IMiddlewares {
  handleContext(messageContext: MessageContext) {
    return messageContext;
  }

  handleParams(params: any[]) {
    return stringify(
      params.map((item) =>
        item instanceof Error ? serializeError(item) : item
      )
    ).slice(1, -1);
  }
}
