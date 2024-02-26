import { swClient, SWClient } from './client';

// eslint-disable-next-line dot-notation
(window as any)['_swClient'] = swClient;

/** @deprecated Please create swClient by yourself. new SWClient(() => Promise<ServiceWorker>) */
export default swClient;
export {
  /** @deprecated Please create swClient by yourself. new SWClient(() => Promise<ServiceWorker>) */
  swClient,
  SWClient,
};
export * from '../shared/types';
