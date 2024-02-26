/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/* eslint-disable no-use-before-define */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable camelcase */
import { injectScript, global } from '@ringcentral/mfe-shared';
import { getEntry } from './getEntry';
import { ExposeOptions } from './interface';

// container for module federation dynamic import
const getContainer = (name: string) => (window as Record<string, any>)[name];

export const getModule = async ({
  name,
  module,
}: {
  name: string;
  module: string;
}): Promise<{ default?: ExposeOptions } | undefined> => {
  // Initializes the share scope. This fills it with known provided modules from this build and all remotes
  await __webpack_init_sharing__('default');
  const container = getContainer(name); // or get the container somewhere else
  // Initialize the container, it may provide shared modules
  await container.init(__webpack_share_scopes__.default);
  const factory = await container.get(module);
  return factory();
};

/**
 * Dynamic load the module.
 */
export const dynamicLoad = async <T extends ExposeOptions = ExposeOptions>(
  /**
   * The name of the module
   */
  path: string,
  /**
   * The remote entry of the module
   */
  entry?: string,
  /**
   * The default remote of the module
   */
  options: {
    /**
     * optional value to set the maximum number of retries to load the module remote script.
     * The default is 1.
     */
    maxRetries?: number;
    /**
     * Optional number value to set the delay time in milliseconds to try to load the module remote script again.
     * The default value is 1000.
     */
    retryDelay?: number;
  } = {}
): Promise<{ default: T }> => {
  global.__RC_MFE_USE_LOADER__ = true;
  const isContainsOrg = /^@/.test(path);
  const paths = path.split('/');
  const relativePath = isContainsOrg
    ? paths.slice(2).join('/')
    : paths.slice(1).join('/');
  const name = isContainsOrg ? paths.slice(0, 2).join('/') : paths[0];
  const modulePath = `./${relativePath}`;
  let link = entry;
  try {
    const container = getContainer(name);
    if (typeof container === 'undefined') {
      if (!link) {
        link = (await getEntry(name)).entry;
      }
      await injectScript({
        url: link,
        retryTimes: options.maxRetries ?? 1,
        retryDelay: options.retryDelay ?? 1000,
        injectScript,
      });
    }
    const module = await getModule({
      name,
      module: modulePath,
    });
    if (typeof module?.default === 'undefined') {
      throw new Error(`[MFE] '${name}' app should export default exposed API.`);
    }
    return module as { default: T };
  } catch (e) {
    console.error(`[MFE] Failed to import module ${modulePath} of ${name} app`);
    throw e;
  }
};
