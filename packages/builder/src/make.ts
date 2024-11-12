/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-async-promise-executor */
/* eslint-disable no-promise-executor-return */
/* eslint-disable consistent-return */
import type { SiteConfig } from '@ringcentral/mfe-shared';

// !!! Make sure that any variables of the function are serializable and passed in externally,
// !!! otherwise it will throw error in MFE runtime.
export const makeRemoteScript = (
  getGlobal: typeof import('@ringcentral/mfe-shared').getGlobal,
  {
    name,
    dependencyVersion,
    identifierContainer,
    defaultRemote,
    packageName,
    version,
  }: {
    name: string;
    dependencyVersion: string;
    identifierContainer: typeof import('@ringcentral/mfe-shared').identifierContainer;
    defaultRemote: string;
    packageName?: string;
    version?: string;
  }
) =>
  new Promise((resolve) => {
    const _global = getGlobal();
    if ((_global as any)[name]) return resolve((_global as any)[name]);
    if (_global.SharedWorkerGlobalScope) {
      // decode rule mapping with `core/src/meta.ts` getWorkerName function
      let remoteEntry = '';
      try {
        remoteEntry = JSON.parse(atob(_global.name.split('#')[1]))[name].entry;
      } catch (e) {
        console.error(
          `[MFE] Failed to parse remote entry for ${name}, please check that the worker name must be wrapped using 'getWorkerName'.`
        );
        throw e;
      }
      // TODO: support custom worker remote
      const url = new URL(remoteEntry);
      // replace the default remote with the worker remote
      // e.g. http://localhost:3000/remoteEntry.js -> http://localhost:3000/worker/remoteEntry.js
      const pathname = url.pathname.split('/');
      pathname.splice(-1, 0, 'worker');
      const workerRemote = remoteEntry.replace(
        url.pathname,
        pathname.join('/')
      );
      importScripts(workerRemote);
    }
    const toBeResolved = () => {
      const container =
        (_global as any)[name] ??
        _global[identifierContainer].dynamicImport({
          dependency: name,
          defaultRemote,
          name: packageName,
          version: version || '',
          dependencyVersion,
        });
      resolve(container);
    };
    if (
      !_global[identifierContainer] ||
      !_global[identifierContainer].dynamicImport
    ) {
      _global[identifierContainer] = _global[identifierContainer] ?? {};
      _global[identifierContainer].toBeResolved =
        _global[identifierContainer].toBeResolved ?? [];
      _global[identifierContainer].toBeResolved.push(toBeResolved);
      return;
    }
    toBeResolved();
  });

export const makeBannerScript = (
  getGlobal: typeof import('@ringcentral/mfe-shared').getGlobal,
  injectScript: typeof import('@ringcentral/mfe-shared').injectScript,
  getEntryFromRegistry: typeof import('@ringcentral/mfe-shared').getEntryFromRegistry,
  fetchWithJsonp: typeof import('@ringcentral/mfe-shared').fetchWithJsonp,
  satisfiesVersion: typeof import('@ringcentral/mfe-shared').satisfiesVersion,
  isSatisfied: typeof import('@ringcentral/mfe-shared').isSatisfied,
  {
    identifierContainer,
    mfeConfig,
    identifier,
    maxRetries,
    retryDelay,
  }: {
    identifierContainer: typeof import('@ringcentral/mfe-shared').identifierContainer;
    mfeConfig: Pick<
      SiteConfig,
      Exclude<keyof SiteConfig, 'shared' | 'optimization'>
    >;
    identifier: string;
    maxRetries: number;
    retryDelay: number;
  }
) => {
  class MemoryStorage implements Storage {
    private _data: Map<string, any> = new Map();

    getItem(key: string) {
      return this._data.get(key);
    }

    setItem(key: string, value: any) {
      this._data.set(key, value);
    }

    removeItem(key: string) {
      this._data.delete(key);
    }

    get length() {
      return this._data.size;
    }

    key(idx: number) {
      return [...this._data.keys()][idx];
    }

    keys() {
      return [...this._data.keys()];
    }

    ready() {
      return true;
    }

    clear() {
      this._data.clear();
    }
  }

  const _global = getGlobal();
  if (_global.WorkerGlobalScope) {
    // use window instead of self in worker
    (_global as any).window = _global;
  }
  _global.localStorage = _global.localStorage || new MemoryStorage();
  _global[identifierContainer] = _global[identifierContainer] ?? {};
  _global[identifierContainer].main =
    _global[identifierContainer].main ?? mfeConfig.name;
  _global[identifierContainer].version =
    _global[identifierContainer].version ?? mfeConfig.version ?? '*';
  _global[identifierContainer].defaultMode =
    _global[identifierContainer].defaultMode ?? mfeConfig.defaultMode ?? '*';
  const { main, defaultMode } = _global[identifierContainer];
  const storageKey = [identifier, main].join(':');
  const mode = _global.localStorage.getItem(storageKey) ?? defaultMode;
  const _prefix =
    typeof mfeConfig.prefix === 'object'
      ? mfeConfig.prefix[mode]
      : mfeConfig.prefix;
  if (_prefix) Object.assign(mfeConfig, { prefix: _prefix });
  _global[identifierContainer].prefix =
    _global[identifierContainer].prefix ?? (mfeConfig.prefix as string) ?? '*';
  _global[identifierContainer].toBeResolved =
    _global[identifierContainer].toBeResolved || [];
  _global[identifierContainer].modules =
    _global[identifierContainer].modules || {};
  const _registry =
    typeof mfeConfig.registry === 'object'
      ? mfeConfig.registry[mode]
      : mfeConfig.registry;
  if (_registry) Object.assign(mfeConfig, { registry: _registry });
  _global[identifierContainer].registry =
    _global[identifierContainer].registry ??
    _global.localStorage.getItem(`${storageKey}:registry`) ??
    mfeConfig.registry ??
    '*';
  _global[identifierContainer].registryType =
    _global[identifierContainer].registryType ??
    mfeConfig.registryType ??
    'fetch';
  _global[identifierContainer].registryAutoFetch =
    _global[identifierContainer].registryAutoFetch ??
    mfeConfig.registryAutoFetch ??
    false;
  _global[identifierContainer]._onUpdateStorage =
    _global[identifierContainer]._onUpdateStorage ?? new Set();
  _global[identifierContainer]._updateStorage =
    _global[identifierContainer]._updateStorage ?? new Set();
  _global[identifierContainer].modules[mfeConfig.name!] = _global[
    identifierContainer
  ].modules[mfeConfig.name!]
    ? {
        ...mfeConfig,
        ..._global[identifierContainer].modules[mfeConfig.name!],
      }
    : mfeConfig;
  _global[identifierContainer].renderContainers =
    _global[identifierContainer].renderContainers || {};
  _global[identifierContainer].styles =
    _global[identifierContainer].styles || {};
  _global[identifierContainer].loads = _global[identifierContainer].loads || {};
  _global[identifierContainer].storage =
    _global[identifierContainer].storage ?? _global.localStorage;
  _global[identifierContainer]._toBeResolvedUpdateStorage =
    _global[identifierContainer]._toBeResolvedUpdateStorage === undefined
      ? new Set()
      : _global[identifierContainer]._toBeResolvedUpdateStorage;
  _global[identifierContainer].dynamicImport =
    _global[identifierContainer].dynamicImport ??
    (({
      dependency,
      defaultRemote: defaultEntry,
      name,
      version,
      dependencyVersion,
    }: {
      dependency: string;
      defaultRemote: string;
      name: string;
      version: string;
      dependencyVersion: string;
    }) => {
      // In order to ensure concurrent loading across MFE apps, a layer of caching is needed here to avoid repeated loading.
      // but the cache here needs to consider the case of load failure, and a retry mechanism is needed.
      _global[identifierContainer].loads[dependency] =
        _global[identifierContainer].loads[dependency] ??
        new Promise((_resolve, _reject) => {
          getEntryFromRegistry(
            getGlobal,
            fetchWithJsonp,
            satisfiesVersion,
            isSatisfied,
            {
              dependency,
              name,
              version,
              defaultEntry,
              identifier,
              identifierContainer,
              dependencyVersion,
            }
          ).then(({ entry }) => {
            injectScript({
              url: entry,
              retryTimes: maxRetries,
              retryDelay,
              injectScript,
            })
              .then(() => {
                _resolve((_global as any)[dependency]);
              })
              .catch((error) => {
                _reject(error);
                delete _global[identifierContainer].loads[dependency];
              });
          });
        });
      return _global[identifierContainer].loads[dependency];
    });

  _global[identifierContainer].toBeResolved.forEach((fn: () => void) => {
    fn();
  });
  _global[identifierContainer].toBeResolved.length = 0;
};
