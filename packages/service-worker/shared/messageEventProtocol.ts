import { serializeError } from './serialize-utils';

export type EventData<T> = {
  type: '@ringcentral/mfe-service-worker';
  eventName: string;
  payload: T;
};

export type EventResponse<T> = {
  isError: boolean;
  error: string;
  data: T;
};

export const buildResponse = <T>(data: T) => {
  return {
    isError: false,
    data,
  };
};

export const buildErrorResponse = (error: Error) => {
  return {
    isError: true,
    error: serializeError(error),
  };
};

export const buildEventData = <T>(eventName: string, payload: T) => {
  return {
    type: '@ringcentral/mfe-service-worker',
    eventName,
    payload,
  };
};

export const isEventData = (data: any): data is EventData<unknown> => {
  if (Object.prototype.toString.call(data) === '[object Object]') {
    return data.type === '@ringcentral/mfe-service-worker';
  }
  return false;
};

export const isEvent = <T>(
  eventName: string,
  data: any
): data is EventData<T> => {
  if (isEventData(data)) {
    return data.eventName === eventName;
  }
  return false;
};
