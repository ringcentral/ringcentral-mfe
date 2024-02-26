import {
  RegisterSuccessResult,
  ResInfo,
  SubAppInfo,
  SubAppStatus,
} from '../shared/types';
import { logger } from './logger';
import { SubAppCacheController } from './sub-app-cache-controller';
import { getCacheName } from './utils/caches-utils';
import { getSubAppInfo } from './utils/info-utils';

const canHandle = (
  subApp: SubAppCacheController | undefined,
  request: FetchEvent,
  url: URL
) => {
  if (!subApp) {
    return false;
  }
  if (url.href.startsWith(subApp.scope)) {
    const inCacheList = subApp.files.some((file) => url.href === file.url);
    return inCacheList;
  }
  return false;
};

/*
  多版本管理, 目前同时最多存在2个版本
  active版本, 后台预下载版本
*/
export class SubAppMultiVersionContainer {
  private _activeSubApp?: SubAppCacheController;

  private _backgroundSubApp?: SubAppCacheController;

  private _deprecatedSet = new Set<SubAppCacheController>();

  constructor(public readonly name: string) {}

  canHandle(event: FetchEvent, url: URL): boolean {
    return (
      canHandle(this._activeSubApp, event, url) ||
      canHandle(this._backgroundSubApp, event, url)
    );
  }

  handleFetchEvent(event: FetchEvent, url: URL) {
    if (canHandle(this._activeSubApp, event, url)) {
      event.respondWith(this._activeSubApp!.handleFetchEvent(event, url));
    } else if (canHandle(this._backgroundSubApp, event, url)) {
      event.respondWith(this._backgroundSubApp!.handleFetchEvent(event, url));
    }
  }

  async register(
    subAppInfo: SubAppInfo,
    md5: string,
    files: ResInfo[],
    manifestResponse: Response,
    cacheStoreName?: string
  ): Promise<RegisterSuccessResult> {
    logger.log(
      'registerSubApp: ',
      getSubAppInfo(subAppInfo, cacheStoreName),
      'md5:',
      md5,
      '\n currentActive: ',
      getSubAppInfo(this._activeSubApp),
      '\n currentBackground: ',
      getSubAppInfo(this._backgroundSubApp)
    );
    if (
      md5 === this._activeSubApp?.cacheMD5 &&
      subAppInfo.version === this._activeSubApp?.version
    ) {
      logger.log(
        `${subAppInfo.name} has already active, version: ${subAppInfo.version} md5: ${md5}`
      );
      const target = this._activeSubApp;
      await target.cacheAssets(manifestResponse);
      return {
        name: subAppInfo.name,
        id: this._activeSubApp.cacheName,
        type: target.isStopped() ? 'deprecated' : 'active',
      };
    }
    let type: RegisterSuccessResult['type'] = 'active';
    const cacheName =
      cacheStoreName ||
      getCacheName({
        name: subAppInfo.name,
        version: subAppInfo.version,
        scope: subAppInfo.scope,
        manifestRelativePath: subAppInfo.manifestRelativePath,
        md5,
        timestamp: Date.now(),
      });
    const subAppCacheController = new SubAppCacheController(
      subAppInfo,
      cacheName,
      md5,
      files
    );

    if (!this._activeSubApp) {
      type = 'active';
      this._activeSubApp = subAppCacheController;
      logger.log(
        `${subAppInfo.name} first active version: ${subAppCacheController.version} cacheName: ${cacheName}`
      );
    } else {
      type = 'pre-cache';
      // already has active subApp, put into background
      logger.log(
        'Already has an active subApp:',
        this._activeSubApp.cacheName,
        'will put into background: ',
        cacheName
      );
      // stopList.push(this._activeSubApp);
      if (this._backgroundSubApp) {
        // promote to active
        if (
          this._backgroundSubApp.cacheMD5 === md5 &&
          this._backgroundSubApp.version === subAppInfo.version
        ) {
          logger.log(
            `Detect same md5 with pre background SubApp: `,
            this._backgroundSubApp
          );
          // trigger fetch if cache not completed.
          const target = this._backgroundSubApp;
          await target.cacheAssets(manifestResponse);
          return {
            name: subAppInfo.name,
            id: this._backgroundSubApp.cacheName,
            type: target.isStopped() ? 'deprecated' : type,
          };
        }
        // stop pre background
        logger.log(
          'Detect different md5 with pre background SubApp: ',
          this._backgroundSubApp,
          'will stop pre backgroundSubApp: ',
          this._backgroundSubApp.cacheName
        );
        this._addToDeprecatedList(this._backgroundSubApp);
      }
      logger.log('Set as background subApp:', cacheName);
      this._backgroundSubApp = subAppCacheController;
    }
    try {
      await subAppCacheController.cacheAssets(manifestResponse);
    } catch (error) {
      logger.log(`Pre-cache subApp failed: ${cacheName}`, error);
      throw error;
    } finally {
      this._stopDeprecatedApps();
    }
    return {
      name: subAppInfo.name,
      id: cacheName,
      type,
    };
  }

  async active() {
    if (!this._backgroundSubApp) {
      return;
    }
    if (
      this._backgroundSubApp.cacheMD5 === this._activeSubApp?.cacheMD5 &&
      this._backgroundSubApp.version === this._activeSubApp?.version
    ) {
      logger.warn(
        'same app',
        this._backgroundSubApp.cacheName,
        this._activeSubApp.cacheName
      );
      if (this._backgroundSubApp.cacheName === this._activeSubApp?.cacheName) {
        delete this._backgroundSubApp;
        return;
      }
    }
    this._addToDeprecatedList(this._activeSubApp);
    logger.debug(
      `${this.name}: active from ${this._activeSubApp?.cacheName} -> ${this._backgroundSubApp.cacheName}`
    );
    this._activeSubApp = this._backgroundSubApp;
    this._backgroundSubApp = undefined;
  }

  async deleteInactive() {
    await this._stopDeprecatedApps();
  }

  getStatus(): SubAppStatus[] {
    return [
      this._getSubAppStatus('active', this._activeSubApp),
      this._getSubAppStatus('pre-cache', this._backgroundSubApp),
      ...Array.from(this._deprecatedSet).map((item) =>
        this._getSubAppStatus('deprecated', item)
      ),
    ].filter((item) => !!item) as SubAppStatus[];
  }

  getActiveSubApp() {
    return this._activeSubApp;
  }

  private _getSubAppStatus(
    type: SubAppStatus['type'],
    subApp?: SubAppCacheController
  ): SubAppStatus | undefined {
    if (!subApp) {
      return undefined;
    }
    return {
      name: subApp.name,
      version: subApp.version,
      manifestRelativePath: subApp.manifestRelativePath,
      cacheStoreName: subApp.cacheName,
      scope: subApp.scope,
      type,
    };
  }

  private _addToDeprecatedList(subApp?: SubAppCacheController) {
    if (subApp) {
      this._deprecatedSet.add(subApp);
    }
  }

  private _stopDeprecatedApps() {
    return Promise.all(
      Array.from(this._deprecatedSet).map((item) =>
        item.stop().then(() => this._deprecatedSet.delete(item))
      )
    );
  }
}
