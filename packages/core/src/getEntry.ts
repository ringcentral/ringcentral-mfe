/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
import {
  getEntryFromRegistry,
  global,
  getGlobal,
  fetchWithJsonp,
  identifier,
  EntryResult,
  isSatisfied,
  satisfiesVersion,
} from '@ringcentral/mfe-shared';
import { identifierContainer } from './constants';
import { getConfigByDependency } from './utils';

export const getEntry = async (
  dependency: string,
  {
    autoFetch,
    autoStore = true,
  }: {
    /**
     * Whether to fetch the entry from registry, default to registryAutoFetch from site config
     */
    autoFetch?: boolean;
    /**
     * Whether to store the entry to registry, default to true
     */
    autoStore?: boolean;
  } = {}
): Promise<EntryResult> => {
  const { dependencies, name, version } = getConfigByDependency(dependency)!;
  const { entry: defaultEntry } = dependencies[dependency];
  const { registry, registryAutoFetch } = global[identifierContainer];
  if (registry) {
    return getEntryFromRegistry(
      getGlobal,
      fetchWithJsonp,
      satisfiesVersion,
      isSatisfied,
      {
        dependency,
        name,
        version,
        dependencyVersion: dependencies[dependency].dependencyVersion,
        defaultEntry,
        identifier,
        identifierContainer,
        autoFetch: autoFetch ?? registryAutoFetch,
        autoStore,
      }
    );
  }
  return { entry: defaultEntry };
};
