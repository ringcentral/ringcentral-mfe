import { ServiceMessageEnum } from '../shared/constants';
import { logToggle } from '../shared/logToggle';
import {
  RegisterSuccessResult,
  SubAppInfo,
  SubAppStatus,
} from '../shared/types';
import { logger } from './logger';
import { MessageClient } from './MessageClient';

interface IServiceWorkerClient {
  registerSubApp(subApp: SubAppInfo): Promise<RegisterSuccessResult>;
  // please activeSubApps then refresh after register success with type: pre-cache ;
  activeSubApps(subApps: { id: string; name: string }[]): Promise<void>;
  /**
   *
   * @param appNames appNames or empty for all apps
   */
  deleteInactive(appNames?: string[]): Promise<void>;
  getSubAppStatus(): Promise<SubAppStatus[]>;
  toggleLog(enable?: boolean): Promise<void>;
  getSubAppActiveInfo(name: string): Promise<SubAppInfo>;
}

class SWClient implements IServiceWorkerClient {
  private _messageClient: MessageClient;

  private _syncedLogToggle = true;

  constructor(private _getSw: () => Promise<ServiceWorker>) {
    this._messageClient = new MessageClient(this._getSw);
    logToggle.update();
  }

  private _syncLogToggleOnce = () => {
    if (this._syncedLogToggle) {
      this._syncedLogToggle = false;
      this._messageClient
        .invoke(ServiceMessageEnum.TOGGLE_LOG, logToggle.isEnable())
        .catch(() => {
          this._syncedLogToggle = false;
        });
    }
  };

  async getSubAppStatus(): Promise<SubAppStatus[]> {
    this._syncLogToggleOnce();
    return this._messageClient.invoke(
      ServiceMessageEnum.GET_SUB_APP_STATUS,
      {}
    );
  }

  async registerSubApp(subApp: SubAppInfo): Promise<RegisterSuccessResult> {
    this._syncLogToggleOnce();
    const { name, scope, version, manifestRelativePath } = subApp;
    // eslint-disable-next-line dot-notation
    if (
      !manifestRelativePath &&
      (subApp as unknown as { cacheFileUrl: string }).cacheFileUrl
    ) {
      logger.warn(
        `cacheFileUrl was deprecated, use manifestRelativePath instead`
      );
      return Promise.reject(
        new Error(
          `cacheFileUrl was deprecated, use manifestRelativePath instead. ${name}@${version}`
        )
      );
    }
    return this._messageClient.invoke(ServiceMessageEnum.REGISTER, {
      name,
      scope,
      version,
      manifestRelativePath,
    });
  }

  async activeSubApps(subApps: { id: string; name: string }[]): Promise<void> {
    this._syncLogToggleOnce();
    return this._messageClient.invoke(
      ServiceMessageEnum.ACTIVE_PRE_CACHE_SUB_APPS,
      subApps
    );
  }

  async deleteInactive(appNames?: string[]): Promise<void> {
    this._syncLogToggleOnce();
    return this._messageClient.invoke(ServiceMessageEnum.DELETE_INACTIVE, {
      appNames,
    });
  }

  async toggleLog(enable = true): Promise<void> {
    logToggle.setEnable(enable);
    return this._messageClient.invoke(ServiceMessageEnum.TOGGLE_LOG, enable);
  }

  async getSubAppActiveInfo(name: string): Promise<SubAppInfo> {
    this._syncLogToggleOnce();
    return this._messageClient.invoke(
      ServiceMessageEnum.GET_SUB_APP_ACTIVE_INFO,
      name
    );
  }
}

const swClient = new SWClient(() =>
  Promise.resolve(navigator.serviceWorker.controller!)
);

export { swClient, SWClient };
