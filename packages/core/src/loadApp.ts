/* eslint-disable @typescript-eslint/no-explicit-any */
import { global } from '@ringcentral/mfe-shared';
import { Loader } from './interface';

export const loadApp = (load: Loader<any>, name: string) => {
  if (__DEV__ && typeof name !== 'string') {
    throw new Error(`[MFE] 'name' should be a string.`);
  }
  global.__RC_MFE_USE_LOADER__ = true;
  return load(name);
};
