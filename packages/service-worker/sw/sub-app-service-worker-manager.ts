import { logCoreManager } from '@ringcentral/mfe-shared';

import { Barrier } from '../shared/Barrier';
import { ServiceMessageEnum } from '../shared/constants';
import { SubAppInfo } from '../shared/types';
import { logger } from './logger';
import { handleClientEvent } from './messageServer';
import { SubAppMultiVersionContainer } from './sub-app-versions-container';
import { parseCacheName } from './utils/caches-utils';
import { getSubAppInfo } from './utils/info-utils';
import { fetchCacheFiles, paseManifestContent } from './utils/manifest-utils';

declare const self: ServiceWorkerGlobalScope;

export class SubAppServiceWorkerManager {
  private _subAppContainers: SubAppMultiVersionContainer[] = [];

  private _subAppContainerMap: Map<string, SubAppMultiVersionContainer> =
    new Map();

  private _restoreBarrier = new Barrier();

  private _disposes: (() => void)[] = [];

  listener() {
    this._disposes.push(
      handleClientEvent(ServiceMessageEnum.REGISTER, this._registerSubApp)
    );
    this._disposes.push(
      handleClientEvent(
        ServiceMessageEnum.ACTIVE_PRE_CACHE_SUB_APPS,
        this._activePreCacheSubApps
      )
    );
    this._disposes.push(
      handleClientEvent(
        ServiceMessageEnum.DELETE_INACTIVE,
        this._deleteInactive
      )
    );
    this._disposes.push(
      handleClientEvent(ServiceMessageEnum.TOGGLE_LOG, this._toggleLogger)
    );
    this._disposes.push(
      handleClientEvent(
        ServiceMessageEnum.GET_SUB_APP_STATUS,
        this._getSubAppStatus
      )
    );
    this._disposes.push(
      handleClientEvent(
        ServiceMessageEnum.GET_SUB_APP_ACTIVE_INFO,
        this._getSubAppActiveInfo
      )
    );
    this._listenerFetch();
    this._restore();
  }

  unListener() {
    this._disposes.forEach((dispose) => dispose());
    this._disposes = [];
  }

  private _toggleLogger = (enable: boolean) => {
    logCoreManager.enable(enable);
  };

  private _getSubAppStatus = () => {
    const status = this._subAppContainers.map((item) => item.getStatus());
    return status;
  };

  private _getSubAppActiveInfo = (data: string) => {
    const container = this._subAppContainerMap.get(data);
    return container ? getSubAppInfo(container.getActiveSubApp()) : undefined;
  };

  private async _restore() {
    try {
      await this._initPreviousSubApps();
    } catch (error) {
      logger.warn('[debug] restore failed.', error);
    }
    this._restoreBarrier.open();
  }

  private async _initPreviousSubApps() {
    const cacheStoreNames = await caches.keys();
    const appSelector = new Map<
      string,
      {
        cacheStoreName: string;
        name: string;
        version: string;
        scope: string;
        manifestRelativePath: string;
        md5: string;
        timestamp: number;
      }
    >();
    const outdateCacheNames: string[] = [];
    const restoreSubApps = cacheStoreNames
      .map((cacheStoreName) => {
        const parsedInfo = parseCacheName(cacheStoreName);
        if (parsedInfo) {
          const prePick = appSelector.get(parsedInfo.name);
          if (!prePick || prePick.timestamp < parsedInfo.timestamp) {
            // eslint-disable-next-line no-unused-expressions
            prePick && outdateCacheNames.push(prePick.cacheStoreName);
            appSelector.set(parsedInfo.name, {
              cacheStoreName,
              ...parsedInfo,
            });
            return {
              cacheStoreName,
              ...parsedInfo,
            };
          }
          outdateCacheNames.push(cacheStoreName);
        }
        return undefined;
      })
      .filter(
        (item) =>
          !!item &&
          appSelector.get(item.name)?.cacheStoreName === item.cacheStoreName
      )
      .map((item) => {
        if (item) {
          logger.log(`[debug] try to restore ${item.cacheStoreName}`, item);
          return this._tryToRestoreSubApp(item.cacheStoreName, item);
        }
        return Promise.resolve();
      });
    await Promise.all([
      restoreSubApps,
      outdateCacheNames.map((item) => {
        logger.log(`[debug] delete outdate store `, item);
        return caches.delete(item);
      }),
    ]);
  }

  private async _tryToRestoreSubApp(
    storeName: string,
    restoreInfo: {
      name: string;
      version: string;
      md5: string;
      scope: string;
      manifestRelativePath: string;
    }
  ) {
    const store = await caches.open(storeName);
    const manifestResponse =
      (await store.match(
        `${restoreInfo.scope}${restoreInfo.manifestRelativePath}`
      )) ||
      (await store.match(
        `${restoreInfo.scope}${restoreInfo.manifestRelativePath}`,
        {
          ignoreSearch: true,
        }
      ));
    if (manifestResponse) {
      const { md5, files } = paseManifestContent(
        await manifestResponse.clone().text(),
        restoreInfo.scope
      );
      if (md5 !== restoreInfo.md5) {
        logger.error(
          `restore from caches failed, md5 not match. delete store ${storeName}`
        );
        await caches.delete(storeName);
        return;
      }
      // const files = await getCacheResList(store);
      let container = this._subAppContainerMap.get(restoreInfo.name);
      if (!container) {
        container = new SubAppMultiVersionContainer(restoreInfo.name);
        this._subAppContainerMap.set(restoreInfo.name, container);
        this._subAppContainers.push(container);
      }
      logger.debug(
        `Restore ${restoreInfo.name} from ${storeName}`,
        restoreInfo
      );
      container.register(
        {
          name: restoreInfo.name,
          version: restoreInfo.version,
          scope: restoreInfo.scope,
          manifestRelativePath: restoreInfo.manifestRelativePath,
        },
        restoreInfo.md5,
        files,
        manifestResponse,
        storeName
      );
    } else {
      logger.error(
        `restore from caches failed, manifest ${restoreInfo.manifestRelativePath} not find from cache. delete store ${storeName}`
      );
      await caches.delete(storeName);
    }
  }

  private _getSubAppContainer(name: string) {
    let container = this._subAppContainerMap.get(name);
    if (!container) {
      container = new SubAppMultiVersionContainer(name);
      this._subAppContainers.push(container);
      this._subAppContainerMap.set(name, container);
    }
    return container;
  }

  private _registerSubApp = async (data: SubAppInfo) => {
    await this._restoreBarrier.wait();
    // const { payload, eventKey } = data;
    logger.log('[debug] handle registerSubApp:', data);
    const { name, scope, manifestRelativePath } = data;
    if (!manifestRelativePath) {
      throw new Error('should pass manifestRelativePath');
    }
    const container = this._getSubAppContainer(name);
    const { md5, files, manifestResponse } = await fetchCacheFiles(
      `${scope}${manifestRelativePath}`,
      scope
    );
    const registerResult = await container.register(
      data,
      md5,
      files,
      manifestResponse
    );
    return registerResult;
  };

  private _activePreCacheSubApps = async (
    subApps: {
      name: string;
      id: string;
    }[]
  ) => {
    return Promise.all(
      subApps.map(({ name }) => this._subAppContainerMap.get(name)?.active())
    );
  };

  private _deleteInactive = async ({
    appNames = Array.from(this._subAppContainerMap.keys()),
  }: {
    appNames?: string[];
  }) => {
    return Promise.all(
      appNames
        .map((appName) =>
          this._subAppContainerMap.get(appName)?.deleteInactive()
        )
        .filter((item) => !!item)
    );
  };

  private _listenerFetch() {
    self.addEventListener('fetch', (event) => {
      const url = new URL(event.request.url);
      const matchScope = this._subAppContainers.find((app) =>
        app.canHandle(event, url)
      );
      if (matchScope) {
        matchScope.handleFetchEvent(event, url);
      } else {
        // logger.log('[debug] miss match: ', event.request.url);
      }
    });
  }
}
