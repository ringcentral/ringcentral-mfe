/* eslint-disable consistent-return */
/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
import type { getGlobal as GetGlobal } from './global';
import type { EntryResult, RegistryData, RegistryResponse } from './interface';
import type { fetchWithJsonp as FetchWithJsonp } from './fetchWithJsonp';
import type { isSatisfied as IsSatisfied } from './isSatisfied';
import type { satisfiesVersion as SatisfiesVersion } from './satisfiesVersion';
import type { identifierContainer as IdentifierContainer } from './constants';

type RegistryQuery = {
  /**
   * The name of app shell
   */
  main: string;
  /**
   * The version of app shell
   */
  mainVersion: string;
  /**
   * The name of mfe
   */
  name: string;
  /**
   * The version of mfe
   */
  version?: string;
  /**
   * The dependency of the mfe
   */
  dependency: string;
  /**
   * The timestamp for cache busting
   */
  _: string;
};

export function getEntryFromRegistry(
  getGlobal: typeof GetGlobal,
  fetchWithJsonp: typeof FetchWithJsonp,
  satisfiesVersion: typeof SatisfiesVersion,
  isSatisfied: typeof IsSatisfied,
  {
    dependency,
    dependencyVersion,
    name,
    version,
    defaultEntry,
    identifier,
    identifierContainer,
    autoFetch: _autoFetch,
    autoStore = true,
  }: {
    name: string;
    version?: string;
    dependency: string;
    dependencyVersion: string;
    defaultEntry: string;
    identifier: string;
    identifierContainer: typeof IdentifierContainer;
    autoFetch?: boolean;
    autoStore?: boolean;
  }
): Promise<EntryResult> {
  const _global = getGlobal();
  let getCacheEntryPromise: Promise<Partial<RegistryData> | undefined>;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const {
    prefix,
    registry,
    registryType,
    version: mainVersion,
    main,
    modules,
    storage,
    _onUpdateStorage,
    _updateStorage,
    _toBeResolvedUpdateStorage,
    registryAutoFetch,
  } = _global[identifierContainer];
  const autoFetch = _autoFetch ?? registryAutoFetch;
  const storageKey = [identifier, main, mainVersion, prefix, dependency].join(
    ':'
  );
  let fetchPromise: Promise<RegistryData | undefined> | undefined;
  if (registry === '*')
    return Promise.resolve({ entry: defaultEntry, fetchPromise });
  // '*' means always use remote entry
  // or the remote version satisfies the dependency version
  // `forcedVersion: true` means always use remote entry even if the remote version is not satisfied

  if (autoFetch) {
    let fetchRawPromise: Promise<RegistryResponse> | undefined;
    const query: RegistryQuery = {
      name,
      dependency,
      main,
      mainVersion,
      _: Date.now().toString(),
    };
    if (version) {
      query.version = version;
    }
    const url = `${registry}?${new URLSearchParams(query!)}`;
    if (registryType === 'fetch') {
      fetchRawPromise = fetch(url)
        .catch((error) => {
          console.error(`[MFE] Failed to fetch remote entry: ${url}`);
          console.error(error);
        })
        .then((response) => response!.json());
    } else if (registryType === 'jsonp') {
      fetchRawPromise = fetchWithJsonp<RegistryResponse>(getGlobal, url, name);
    } else if (registryType === 'server') {
      fetchRawPromise = fetch(
        `${registry}/api/apps/${main}/releases/${mainVersion}`
      )
        .catch((error) => {
          console.error(`[MFE] Failed to fetch remote entry: ${url}`);
          console.error(error);
        })
        .then((response) => response!.json())
        .then((data) => {
          return data.dependenciesLock;
        });
    } else {
      throw new Error(`[MFE] Invalid registry type: ${registryType}`);
    }
    fetchPromise = fetchRawPromise.then((data) => {
      const remoteData = data?.[dependency];
      console.log('remoteData====', remoteData);
      // @ts-ignore
      remoteData.entry = remoteData.remoteEntry;
      if (
        remoteData &&
        isSatisfied(satisfiesVersion, remoteData, dependencyVersion)
      ) {
        const { entry } = remoteData ?? {};
        if (typeof entry !== 'string') {
          throw new Error(
            `[MFE] Invalid entry for ${dependency}: ${entry} from ${url}`
          );
        }
        if (prefix === '*') {
          console.warn(
            `[MFE] The entry of ${dependency} is being cached, but prefix is not validly set, pls set 'prefix' in 'site.config'.`
          );
        }
        if (!autoStore) return remoteData;
        const result = storage.setItem(
          storageKey,
          JSON.stringify(data[dependency])
        );
        const onUpdate = (_remoteData: RegistryData) => {
          getCacheEntryPromise.then((options = {}) => {
            if (
              options.entry === _remoteData.entry &&
              options.version === _remoteData.version &&
              !options.forcedVersion === !_remoteData.forcedVersion
            )
              return;
            _updateStorage.add([dependency, _remoteData, options]);
            _onUpdateStorage.forEach((callback) => {
              callback(dependency, _remoteData, options);
            });
          });
        };
        if (result instanceof Promise) {
          result.then(() => {
            if (_toBeResolvedUpdateStorage) {
              _toBeResolvedUpdateStorage.add(() => onUpdate(remoteData));
              return;
            }
            onUpdate(remoteData);
          });
        } else {
          if (_toBeResolvedUpdateStorage) {
            _toBeResolvedUpdateStorage.add(() => onUpdate(remoteData));
            return;
          }
          onUpdate(remoteData);
        }
      }
    });
  }

  const getEntry = (value: string | null) => {
    if (!value) return;
    const {
      entry,
      forcedVersion,
      version: cacheVersion = '*',
      meta,
    } = JSON.parse(value) as RegistryData;
    return {
      meta,
      entry,
      forcedVersion,
      version: cacheVersion,
    };
  };

  const value = storage.getItem(storageKey);
  if (value instanceof Promise) {
    getCacheEntryPromise = value.then(getEntry);
  } else {
    getCacheEntryPromise = Promise.resolve(value).then(getEntry);
  }
  return getCacheEntryPromise!.then((options) => {
    let currentEntry = defaultEntry;
    if (isSatisfied(satisfiesVersion, options, dependencyVersion)) {
      currentEntry = options.entry;
      const currentVersion = options.version;
      Object.values(modules).forEach((module) => {
        if (module.dependencies?.[dependency]) {
          module.dependencies[dependency].entry = currentEntry;
          module.dependencies[dependency].version = currentVersion;
          module.dependencies[dependency].forcedVersion =
            !!options.forcedVersion;
          module.dependencies[dependency].meta = options.meta;
        }
      });
    }

    return { entry: currentEntry, fetchPromise };
  });
}
