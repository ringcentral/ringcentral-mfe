import { SubAppInfo } from '../../shared/types';

export const getSubAppInfo = (subApp?: SubAppInfo, cacheStoreName?: string) => {
  if (!subApp) {
    return undefined;
  }
  return {
    name: subApp.name,
    version: subApp.version,
    manifestRelativePath: subApp.manifestRelativePath,
    cacheStoreName,
    scope: subApp.scope,
  };
};
