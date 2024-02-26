/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable no-param-reassign */
import { identifier, identifierAttribute, global } from '@ringcentral/mfe-shared';
import type { SendOptions } from './interface';

export const hasParentMFE = (scope: RegExp) =>
  !!global.name &&
  new RegExp(`^${identifier}`).test(global.name) &&
  scope.test(global.name);

const postMessageToFrames = ({
  message,
  origin: targetOrigin,
  source,
  scope,
}: {
  message: SendOptions;
  origin: string;
  scope: RegExp;
  source: MessageEventSource | null;
}) => {
  Array.from(document.getElementsByTagName('iframe')).forEach((frame) => {
    const isMFE = !!frame.getAttribute(identifierAttribute);
    const isSameFrame = frame.contentWindow === source;
    // The message transported by the current frame is not being transported to itself.
    if (isMFE && !isSameFrame && scope.test(frame.getAttribute('name')!)) {
      frame.contentWindow!.postMessage(message, targetOrigin as string);
    }
  });
};

export const broadcastMessage = ({
  data: message,
  origin: targetOrigin,
  source,
  scope,
}: {
  data: SendOptions;
  origin: string;
  scope: RegExp;
  source: MessageEventSource | null;
}) => {
  if (!message?.__DATA_TRANSPORT_UUID__) return;
  if (!message.downward) {
    if (hasParentMFE(scope)) {
      global.parent.postMessage(message, targetOrigin as string);
    } else {
      // The mfe apps of the top level, and start spreading the message downward
      message.downward = true;
      postMessageToFrames({
        message,
        origin: targetOrigin,
        source,
        scope,
      });
    }
  } else {
    postMessageToFrames({
      message,
      origin: targetOrigin,
      source,
      scope,
    });
  }
};
