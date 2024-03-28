/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-shadow */
import fetch from 'node-fetch';

export interface FetchOptions {
  name: string;
  version: string;
  registry: string;
  type: 'app' | 'module';
}

interface DepData {
  dependencies: Record<string, string>;
  version: string;
  meta: Record<string, unknown>;
  variants: {
    remoteEntry: string;
    brandCode: string;
    metadata: Record<string, unknown>;
  }[];
}

export interface ModuleInfo {
  entry: string;
  version: string;
  brandCode: string;
  meta: Record<string, unknown>;
}

const fetchWithModule = async ({
  registry,
  name,
  version,
  deps,
}: {
  registry: string;
  name: string;
  version: string;
  deps: Record<string, ModuleInfo[]>;
}) => {
  if (deps[name]) return;
  const url = `${registry}/api/modules/${name}/releases/${version}`;
  const response = await fetch(url);
  const moduleData: DepData = await response.json();
  deps[name] = moduleData.variants.map((item) => ({
    entry: item.remoteEntry,
    version: moduleData.version,
    brandCode: item.brandCode,
    meta: {
      ...moduleData.meta,
      ...item.metadata,
    },
  }));
  for (const [subModuleName, subVersion] of Object.entries(
    moduleData.dependencies
  ) as [string, string][]) {
    if (!deps[subModuleName]) {
      await fetchWithModule({
        deps,
        name: subModuleName,
        version: subVersion,
        registry,
      });
    }
  }
};

export const fetchInfo = async ({
  name,
  version,
  registry,
  type,
}: FetchOptions) => {
  if (!name || !version || !registry) {
    throw new Error(`'name' and 'version' are required.`);
  }
  if (type !== 'app' && type !== 'module') {
    throw new Error(
      `'type' can not be '${type}', it should be 'app' or 'module'.`
    );
  }
  const isApp = type === 'app';
  const data: {
    name: string;
    version: string;
    registry: string;
    type: 'app' | 'module';
    dependencyLocks: Record<string, ModuleInfo[]>;
  } = {
    name,
    version,
    registry,
    type,
    dependencyLocks: {},
  };
  if (isApp) {
    const url = `${registry}/api/apps/${name}/releases/${version}`;
    const response = await fetch(url);
    const result = await response.json();
    for (const [moduleName, moduleInfo] of Object.entries(
      result.dependencyLocks
    ) as [string, DepData][]) {
      data.dependencyLocks[moduleName] = moduleInfo.variants.map((item) => ({
        entry: item.remoteEntry,
        version: moduleInfo.version,
        brandCode: item.brandCode,
        meta: {
          ...moduleInfo.meta,
          ...item.metadata,
        },
      }));
      for (const [moduleName, version] of Object.entries(
        moduleInfo.dependencies
      ) as [string, string][]) {
        if (!data.dependencyLocks[moduleName]) {
          await fetchWithModule({
            deps: data.dependencyLocks,
            name: moduleName,
            version,
            registry,
          });
        }
      }
    }
  } else {
    await fetchWithModule({
      name,
      version,
      registry,
      deps: data.dependencyLocks,
    });
  }
  delete data.dependencyLocks[name];
  return data;
};
