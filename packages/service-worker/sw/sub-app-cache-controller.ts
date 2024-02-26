import { ServiceWorkerCacheStatus } from '../shared/constants';
import { ResInfo, SubAppInfo } from '../shared/types';
import { logger } from './logger';
import { getCacheResList } from './utils/caches-utils';
import { runAll } from './utils/promise-utils';

export interface ISubAppCacheController {
  name: string;
  scope: string;
  manifestRelativePath: string;
  version: string;
}

class UsageReference {
  private _usageCount = 0;

  private _callbacks: (() => void)[] = [];

  request() {
    this._usageCount += 1;
  }

  release() {
    this._usageCount -= 1;
    if (this._usageCount === 0) {
      const callbacks = this._callbacks;
      this._callbacks = [];
      callbacks.forEach((cb) => cb());
    }
  }

  async waitUntilNoUsage(): Promise<void> {
    if (this._usageCount === 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this._callbacks.push(resolve);
    });
  }
}

export class SubAppCacheController implements ISubAppCacheController {
  name: string;

  scope: string;

  version: string;

  cacheStatus: ServiceWorkerCacheStatus;

  manifestRelativePath: string;

  private _downloadMap: Map<
    string,
    {
      reqUrl: string;
      task: Promise<void>;
    }
  > = new Map();

  private _usageRef = new UsageReference();

  private _cacheAssetsPromise?: Promise<void>;

  private _isStop = false;

  constructor(
    options: SubAppInfo,
    public cacheName: string,
    public cacheMD5: string,
    public readonly files: ResInfo[]
  ) {
    this.name = options.name;
    this.scope = options.scope;
    this.version = options.version;
    this.manifestRelativePath = options.manifestRelativePath;
    this.cacheStatus = ServiceWorkerCacheStatus.CACHE_INITIAL;
  }

  async handleFetchEvent(event: FetchEvent, url: URL): Promise<Response> {
    try {
      this._usageRef.request();
      const response = await this._handleFetchEvent(event, url);
      this._usageRef.release();
      return response;
    } catch (error) {
      this._usageRef.release();
      throw error;
    }
  }

  async _handleFetchEvent(event: FetchEvent, url: URL): Promise<Response> {
    // this.files.find(file => file.url === url.href);
    const cacheStore = await caches.open(this.cacheName);
    const downloadTask = this._downloadMap.get(url.href);
    if (downloadTask) {
      // logger.log(`[debug] ${this.name} url in download list: ${url.href}`);
      await downloadTask.task;
      const response = await cacheStore.match(event.request.url);
      // logger.log(
      //   `[debug] ${this.name} resp from new downloaded cache: ${url.href}`
      // );
      return response ?? fetch(event.request);
    }
    // downloadList.find();
    const urlMatchResponse = await cacheStore.match(event.request.url);
    if (urlMatchResponse) {
      // logger.log(`[debug] ${this.name} resp from urlMatch: ${url.href}`);
      return urlMatchResponse;
    }
    const urlIgnoreSearchMatchResponse = await cacheStore.match(
      event.request.url,
      {
        ignoreSearch: true,
      }
    );
    if (urlIgnoreSearchMatchResponse) {
      // logger.log(
      //   `[debug] ${this.name} resp from urlIgnoreSearchMatchResponse: ${url.href}`
      // );
      return urlIgnoreSearchMatchResponse;
    }
    // logger.log(`[debug] ${this.name} send new request: ${url.href}`);
    const onlineResponse = await fetch(event.request);
    if (this.files.find((file) => file.url === url.href)) {
      cacheStore.put(event.request, onlineResponse.clone());
    }
    return onlineResponse;
  }

  async cacheAssets(manifestResponse: Response): Promise<void> {
    if (this.cacheStatus === ServiceWorkerCacheStatus.CACHED) {
      return;
    }
    if (
      this.cacheStatus === ServiceWorkerCacheStatus.CACHING &&
      this._cacheAssetsPromise
    ) {
      // wait
      await this._cacheAssetsPromise;
      return;
    }
    this.cacheStatus = ServiceWorkerCacheStatus.CACHING;
    const cacheAssetsPromise = this._cacheAssets(manifestResponse);
    this._cacheAssetsPromise = cacheAssetsPromise;
    await cacheAssetsPromise;
  }

  async _cacheAssets(manifestResponse: Response) {
    try {
      let needToCacheList = this.files;
      const cacheStore = await caches.open(this.cacheName);
      await cacheStore.put(
        `${this.scope}${this.manifestRelativePath}`,
        manifestResponse.clone()
      );
      const cachedList = await getCacheResList(cacheStore);
      if (cachedList) {
        const cachedKeySet = new Set<string>();
        cachedList.forEach((item) => {
          cachedKeySet.add(item.url);
        });
        needToCacheList = this.files.filter(
          (item) => !cachedKeySet.has(item.url)
        );
      }
      if (needToCacheList.length) {
        const controller = new AbortController();
        let errorCounter = 0;
        await runAll(
          needToCacheList.map((file) => {
            const keyUrl = file.url;
            const reqUrl = file.revision
              ? `${file.url}?rev=${file.revision}`
              : file.url;

            const task = fetch(reqUrl, { signal: controller.signal })
              .then((response) => cacheStore.put(keyUrl, response))
              .then(() => {
                // logger.log(`[debug] ${this.name} cache success: ${reqUrl}`);
                this._downloadMap.delete(file.url);
              })
              .catch((error) => {
                logger.log(
                  `${this.name}@${this.version} cache error: ${keyUrl}`,
                  error
                );
                errorCounter += 1;
                this._downloadMap.delete(file.url);
                if (errorCounter > 2) {
                  logger.warn(
                    `cache failed count: ${errorCounter}, will abort rest fetch jobs. `,
                    error
                  );
                  controller.abort();
                }
                throw error;
              });
            this._downloadMap.set(file.url, {
              reqUrl: keyUrl,
              task,
            });
            return task;
          })
        );
      } else {
        // logger.log(
        //   `[debug] ${this.name} already cached! no need to cache again`
        // );
      }
      logger.log(`${this.name}@${this.version} cache finish!`);
      this.cacheStatus = ServiceWorkerCacheStatus.CACHED;
    } catch (e) {
      logger.warn(`${this.name}@${this.version} cacheAssets failed!!`, e);
      this.cacheStatus = ServiceWorkerCacheStatus.CACHE_FAIL;
      throw e;
    }
  }

  isStopped() {
    return Boolean(this._isStop);
  }

  async stop() {
    this._isStop = true;
    // eslint-disable-next-line prefer-destructuring
    const cacheName = this.cacheName;
    logger.log(`[debug] execute stop(): ${this.name} will delete ${cacheName}`);
    await this._usageRef.waitUntilNoUsage();
    logger.log(`[debug] execute stop(): ${this.name} delete ${cacheName}`);
    await caches.delete(cacheName);
  }

  getScope() {
    return this.scope;
  }
}
