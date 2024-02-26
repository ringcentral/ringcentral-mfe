import { Workbox } from 'workbox-window';
import { SubAppInfo, SWClient } from '@ringcentral/mfe-service-worker';
import { logger } from './logger';

export const register = (
  swClient: SWClient,
  subAppInfo: SubAppInfo,
  autoUpgrade = true
) => {
  return swClient
    .registerSubApp(subAppInfo)
    .then((result) => {
      if (autoUpgrade && result.type === 'pre-cache') {
        logger.log(
          'Will auto reload to upgrade to new version',
          subAppInfo,
          result
        );
        setTimeout(async () => {
          await swClient.activeSubApps([{ id: result.id, name: result.name }]);
          window.location.reload();
        }, 2000);
      }
      logger.log('platform sw register success', subAppInfo, result);
      // swClient.active()
    })
    .catch((e: any) => {
      logger.error('platform sw register error', subAppInfo, e);
    });
};

export const workbox = new Workbox('sw.js');
export const swClient = new SWClient(() => workbox.getSW());

export async function registerSW() {
  await workbox.register();

  register(swClient, {
    name: 'app2',
    scope: 'http://localhost:3002/',
    version: '1',
    manifestRelativePath: 'precache-manifest',
  }).then(() => {
    logger.log('[debug] register app2 success');
  });
  register(swClient, {
    name: 'app3',
    scope: 'http://localhost:3003/',
    version: '1',
    manifestRelativePath: 'precache-manifest',
  }).then(() => {
    logger.log('[debug] register app3 success');
  });
}
