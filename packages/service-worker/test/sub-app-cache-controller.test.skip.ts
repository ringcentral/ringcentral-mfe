// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { Md5 } from 'ts-md5';
import { SubAppCacheController } from '../sw/sub-app-cache-controller';
import { ServiceWorkerCacheStatus } from '../shared/constants';

describe('SubAppCacheController', () => {
  let subAppCacheController: SubAppCacheController;
  const options = {
    name: 'test',
    scope: '/test/',
    version: '1.0.0',
    cacheFileUrl: '/test-precache-manifest',
  };
  beforeEach(() => {
    subAppCacheController = new SubAppCacheController(options);
  });

  it('should have correct properties after instantiation', () => {
    expect(subAppCacheController.name).toEqual(options.name);
    expect(subAppCacheController.scope).toEqual(options.scope);
    expect(subAppCacheController.version).toEqual(options.version);
    expect(subAppCacheController.cacheFileUrl).toEqual(options.cacheFileUrl);
    expect(subAppCacheController.cacheStatus).toEqual(
      ServiceWorkerCacheStatus.CACHE_INITIAL
    );
  });

  it('should correctly cache assets', async () => {
    jest
      .spyOn(subAppCacheController, 'fetchCacheFiles')
      .mockReturnValue(Promise.resolve([{ url: '/test', revision: '1.0.0' }]));
    jest
      .spyOn(caches, 'open')
      .mockReturnValue(Promise.resolve({ addAll: () => Promise.resolve() }));
    await subAppCacheController.cacheAssets();
    expect(subAppCacheController.cacheStatus).toEqual(
      ServiceWorkerCacheStatus.CACHED
    );
  });

  it('should correctly throw error when caching assets', async () => {
    jest
      .spyOn(subAppCacheController, 'fetchCacheFiles')
      .mockReturnValue(Promise.reject(new Error('test error')));
    try {
      await subAppCacheController.cacheAssets();
    } catch (e) {
      if (e instanceof Error) {
        expect(e.message).toEqual('test error');
        expect(subAppCacheController.cacheStatus).toEqual(
          ServiceWorkerCacheStatus.CACHE_FAIL
        );
      }
    }
  });

  it('should correctly clean caches', async () => {
    jest
      .spyOn(caches, 'keys')
      .mockReturnValue(
        Promise.resolve(['sub-app-test-1.0.0', 'sub-app-test-2.0.0'])
      );
    jest.spyOn(caches, 'delete').mockReturnValue(Promise.resolve(true));
    await subAppCacheController.cleanCaches();
    expect(caches.delete).toHaveBeenCalledWith('sub-app-test-2.0.0');
  });

  it('should correctly clean outdated caches', async () => {
    jest
      .spyOn(subAppCacheController, 'cleanCaches')
      .mockReturnValue(Promise.resolve([true]));
    await subAppCacheController.cleanOutdatedCaches();
    expect(subAppCacheController.cleanCaches).toHaveBeenCalledWith('1.0.0');
  });

  it('should correctly get scope', () => {
    expect(subAppCacheController.getScope()).toEqual(options.scope);
  });

  it('should correctly get cache name', () => {
    expect(subAppCacheController.getCacheName()).toEqual(
      `sub-app-${options.name}`
    );
    expect(subAppCacheController.getCacheName(options.version)).toEqual(
      `sub-app-${options.name}-${options.version}-${options.scope}`
    );
  });

  it('should correctly fetch cache files', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve('cacheFileName 1234'),
      })
    );
    const cacheFiles = await subAppCacheController.fetchCacheFiles(
      options.cacheFileUrl
    );
    expect(cacheFiles).toEqual([
      { url: '/test/cacheFileName', revision: '1234' },
    ]);
    expect(subAppCacheController.cacheMD5).toEqual(
      Md5.hashStr(`cacheFileName 1234`)
    );
  });
});
