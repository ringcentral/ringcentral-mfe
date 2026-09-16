import { ResInfo } from '../../shared/types';

const BASE_TIMESTAMP = 1679734000000;

/**
 * Bump this version to invalidate previously cached sub-app assets.
 * Caches created with an older version are deleted on service worker
 * activation so affected users recover from stale/invalid cached responses.
 */
const CACHE_VERSION = 'v2';

const CACHE_NAME_PREFIX = `mfe-sub-app-${CACHE_VERSION}-`;

export const getCacheName = (info: {
  name: string;
  scope: string;
  version: string;
  timestamp: number;
  manifestRelativePath: string;
  md5: string;
}) => {
  const { name, scope, version, timestamp, manifestRelativePath, md5 } = info;
  return `${CACHE_NAME_PREFIX}${name}@${version}/${
    timestamp - BASE_TIMESTAMP
  }-${md5}-${scope}@manifest:${manifestRelativePath}`;
};

export const parseCacheName = (
  cacheName: string
):
  | {
      name: string;
      version: string;
      timestamp: number;
      md5: string;
      scope: string;
      manifestRelativePath: string;
    }
  | undefined => {
  // keep in sync with CACHE_VERSION
  const result =
    /mfe-sub-app-v2-([a-zA-Z0-9_-]+)@([a-zA-Z0-9._\->=]+)\/([0-9]+)-([a-zA-Z0-9]+)-(https?:\/\/[^\s]+)@manifest:([^\s]+)/.exec(
      cacheName
    );
  if (result) {
    const [, name, version, timestamp, md5, scope, manifestRelativePath] =
      result;
    return {
      name,
      version,
      scope,
      manifestRelativePath,
      timestamp: Number(timestamp),
      md5,
    };
  }
  return undefined;
};

export const isOutdatedSubAppCacheName = (cacheName: string): boolean => {
  return cacheName.startsWith('mfe-sub-app-') && !parseCacheName(cacheName);
};

export const getCacheResList = async (cache: Cache): Promise<ResInfo[]> => {
  return (await cache.keys()).map((item) => {
    return {
      url: item.url,
    };
  });
};
