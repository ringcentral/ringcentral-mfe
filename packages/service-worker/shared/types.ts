type ResInfo = { url: string; revision?: string };
type SubAppInfo = {
  name: string;
  scope: string;
  version: string;
  manifestRelativePath: string;
};

type RegisterSuccessResult = {
  name: string;
  id: string;
  type: 'active' | 'pre-cache' | 'deprecated';
};

type PreCacheSuccessResult = {
  name: string;
  id: string;
};

type SubAppStatus = SubAppInfo & {
  cacheStoreName: string;
  type: 'active' | 'pre-cache' | 'deprecated';
};

export {
  ResInfo,
  SubAppInfo,
  RegisterSuccessResult,
  PreCacheSuccessResult,
  SubAppStatus,
};
