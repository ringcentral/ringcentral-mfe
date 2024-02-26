import {
  identifierContainer,
  global,
  IStorage,
  identifier,
  RegistryData,
  isSatisfied,
  satisfiesVersion,
} from '@ringcentral/mfe-shared';

global[identifierContainer] = global[identifierContainer] ?? {};

// Due to the fact that remoteEntry.js is loaded first and the remote registry may respond very quickly,
// it can lead to lost events, so a global cache has to be used here.
if (global[identifierContainer]._toBeResolvedUpdateStorage) {
  const { _toBeResolvedUpdateStorage } = global[identifierContainer];
  global[identifierContainer]._toBeResolvedUpdateStorage = null;
  _toBeResolvedUpdateStorage?.forEach((cb) => cb());
}

global[identifierContainer]._onUpdateStorage =
  global[identifierContainer]._onUpdateStorage ??
  new Set<(data: RegistryData) => void>();
// when the remote update fetch has been completed, the update event will be cached for the next `onUpdateEntry(callback)` call
global[identifierContainer]._updateStorage =
  global[identifierContainer]._updateStorage ?? new Set<RegistryData>();
// TODO: support async storage
export const setStorage = (externalStorage: IStorage) => {
  global[identifierContainer].storage = externalStorage;
};

export const getStorage = () => global[identifierContainer].storage;

/**
 * Subscribe to the entry update event
 */
export const onUpdateEntry = (
  callback: (
    /**
     * The name of MFE that has been updated
     */
    name: string,
    /**
     * The new MFE entry
     */
    newValue: RegistryData,
    /**
     * The old MFE entry
     */
    oldValue: RegistryData
  ) => void
) => {
  global[identifierContainer]._onUpdateStorage.add(callback);
  // trigger the update event when the remote update fetch has been completed
  global[identifierContainer]._updateStorage.forEach(
    (data: [string, RegistryData, RegistryData]) => {
      callback(...data);
    }
  );
  return () => {
    global[identifierContainer]._onUpdateStorage.delete(callback);
  };
};

export const getStorageKey = (name: string) => {
  const { prefix, version: mainVersion, main } = global[identifierContainer];
  const storageKey = [identifier, main, mainVersion, prefix, name].join(':');
  return storageKey;
};

/**
 * Update the storage entry
 */
export const updateStorageEntry = (
  /**
   * The name of MFE that has been updated
   */
  name: string,
  /**
   * The new MFE entry
   */
  data: RegistryData
) => {
  const storageKey = getStorageKey(name);

  return global[identifierContainer].storage.setItem(
    storageKey,
    JSON.stringify(data)
  );
};

/**
 * Remove the storage entry
 */
export const removeStorageEntry = (name: string) => {
  const storageKey = getStorageKey(name);

  return global[identifierContainer].storage.removeItem(storageKey);
};

export const getStorageEntry = async (
  name: string,
  dependencyVersion?: string
): Promise<RegistryData | null> => {
  const storageKey = getStorageKey(name);
  try {
    const result = await global[identifierContainer].storage.getItem(
      storageKey
    );
    if (!result) {
      return null;
    }
    const registryData: RegistryData = JSON.parse(result);
    if (dependencyVersion) {
      return isSatisfied(satisfiesVersion, registryData, dependencyVersion)
        ? registryData
        : null;
    }
    return registryData;
  } catch (error) {
    return null;
  }
};

/**
 * set the storage key for dynamic site config
 */
export const setStorageMode = (name: string, value: string) => {
  const storageModeKey = [identifier, name].join(':');
  localStorage.setItem(storageModeKey, value);
};

const getStorageRegistryKey = (name: string) =>
  [identifier, name, 'registry'].join(':');

/**
 * set the storage Registry for dynamic site config
 */
export const setStorageRegistry = (name: string, value: string) => {
  const storageKey = getStorageRegistryKey(name);
  localStorage.setItem(storageKey, value);
};

/**
 * remove the storage Registry for dynamic site config
 */
export const removeStorageRegistry = (name: string) => {
  const storageKey = getStorageRegistryKey(name);
  localStorage.removeItem(storageKey);
};
