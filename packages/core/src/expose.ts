import { global } from '@ringcentral/mfe-shared';
import { ExposeOptions } from './interface';

export const expose = <T extends ExposeOptions>(options: T): T => {
  if (!global.__RC_MFE_USE_LOADER__) {
    // auto init and render app as app shell
    const { render, init } = options;
    const result = init?.();
    if (result instanceof Promise) {
      result.then(() => {
        render();
      });
    } else {
      render();
    }
  }
  return options;
};
