export enum ServiceWorkerCacheStatus {
  CACHE_INITIAL,
  CACHING,
  CACHED,
  CACHE_FAIL,
}

export enum ServiceMessageEnum {
  REGISTER = 'REGISTER',
  ACTIVE_PRE_CACHE_SUB_APPS = 'ACTIVE_PRE_CACHE_SUB_APPS',
  DELETE_INACTIVE = 'DELETE_INACTIVE',
  TOGGLE_LOG = 'TOGGLE_LOG',
  GET_SUB_APP_STATUS = 'GET_SUB_APP_STATUS',
  GET_SUB_APP_ACTIVE_INFO = 'GET_SUB_APP_ACTIVE_INFO',
}

export type ServiceMessageType = ServiceMessageEnum | string;

export type ServiceMessagePayload<T = any> = { payload: T; eventKey: string };

export const ENABLE_LOG_KEY = '__sw_log__';
