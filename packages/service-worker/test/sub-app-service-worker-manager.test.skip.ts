// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { SubAppServiceWorkerManager } from '../sw/sub-app-service-worker-manager';
import { simpleMessageChannel } from '../shared/simple-message-channel';
import { ServiceMessageEnum } from '../shared/constants';

jest.mock('../src/simple-message-channel', () => {
  return {
    simpleMessageChannel: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  };
});
describe('SubAppServiceWorkerManager', () => {
  let subAppServiceWorkerManager: SubAppServiceWorkerManager;

  beforeEach(() => {
    subAppServiceWorkerManager = new SubAppServiceWorkerManager();
  });

  it('should call on and the correct callback', () => {
    const mockListen = jest.spyOn(subAppServiceWorkerManager, 'listenerFetch');
    subAppServiceWorkerManager.listener();
    expect(simpleMessageChannel.on).toHaveBeenNthCalledWith(
      1,
      ServiceMessageEnum.REGISTER,
      subAppServiceWorkerManager.registerSubApp
    );
    expect(simpleMessageChannel.on).toHaveBeenNthCalledWith(
      2,
      ServiceMessageEnum.UN_REGISTER,
      subAppServiceWorkerManager.unRegisterSubApp
    );
    expect(simpleMessageChannel.on).toHaveBeenNthCalledWith(
      3,
      ServiceMessageEnum.GET_STATUS,
      subAppServiceWorkerManager.getSubAppStatus
    );
    expect(mockListen).toHaveBeenCalled();
  });

  it('should call simpleMessageChannel.off when unListener', () => {
    subAppServiceWorkerManager.unListener();
    expect(simpleMessageChannel.off).toHaveBeenNthCalledWith(
      1,
      ServiceMessageEnum.REGISTER
    );
    expect(simpleMessageChannel.off).toHaveBeenNthCalledWith(
      2,
      ServiceMessageEnum.UN_REGISTER
    );
    expect(simpleMessageChannel.off).toHaveBeenNthCalledWith(
      3,
      ServiceMessageEnum.GET_STATUS
    );
  });

  describe('register/unregister sub app', () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve('cacheFileName 1234'),
      })
    );
    jest.spyOn(caches, 'keys').mockReturnValue(Promise.resolve([]));
    jest
      .spyOn(caches, 'open')
      .mockReturnValue(Promise.resolve({ addAll: () => Promise.resolve() }));
    const payload = {
      name: 'test',
      scope: '/test/scope/',
      version: '1.0.0',
      cacheFileUrl: 'test/cache/file',
    };
    const eventKey = 'testEventKey';
    it('should do nothing with the provided data when md5 is same', async () => {
      await subAppServiceWorkerManager.registerSubApp({
        payload,
        eventKey: 'testEventKey',
      });
      subAppServiceWorkerManager.subAppCacheControllers.set = jest.fn();
      await subAppServiceWorkerManager.registerSubApp({
        payload,
        eventKey,
      });

      expect(
        subAppServiceWorkerManager.subAppCacheControllers.set
      ).not.toBeCalled();
    });

    it('should call registerSubApp with the provided data when md5 is different', (done) => {
      subAppServiceWorkerManager
        .registerSubApp({
          payload,
          eventKey,
        })
        .then(() => {
          setTimeout(() => {
            expect(
              subAppServiceWorkerManager.subAppCacheControllers.get('test')
            ).not.toBeUndefined();
            expect(subAppServiceWorkerManager.scopes).toEqual(['/test/scope/']);
            expect(simpleMessageChannel.emit).toBeCalledWith(eventKey);
            done();
          });
        });
    });

    it('should call unRegisterSubApp with the provided data when no cached controller', () => {
      subAppServiceWorkerManager.unRegisterSubApp({
        payload: { name: 'test' },
        eventKey,
      });
      expect(simpleMessageChannel.emit).toBeCalledWith(eventKey, {
        error: `Subapp: ${payload.name} is not registered`,
      });
    });

    it('should call unRegisterSubApp with the provided data', (done) => {
      subAppServiceWorkerManager
        .registerSubApp({
          payload,
          eventKey,
        })
        .then(() => {
          setTimeout(() => {
            expect(subAppServiceWorkerManager.scopes).toEqual([payload.scope]);
            subAppServiceWorkerManager.unRegisterSubApp({
              payload,
              eventKey,
            });
            setTimeout(() => {
              expect(simpleMessageChannel.emit).toBeCalledWith(eventKey);
              expect(subAppServiceWorkerManager.scopes).toEqual([]);
              done();
            });
          });
        });
    });
    it('should call getSubAppStatus with the provided data when without cached controller', () => {
      subAppServiceWorkerManager.getSubAppStatus({
        payload: { name: payload.name },
        eventKey,
      });
      expect(simpleMessageChannel.emit).toBeCalledWith(eventKey, undefined);
    });

    it('should call getSubAppStatus with the provided data when without cached controller', (done) => {
      subAppServiceWorkerManager
        .registerSubApp({
          payload,
          eventKey,
        })
        .then(() => {
          subAppServiceWorkerManager.getSubAppStatus({
            payload: { name: payload.name },
            eventKey,
          });
          expect(simpleMessageChannel.emit).toBeCalledWith(
            eventKey,
            subAppServiceWorkerManager.subAppCacheControllers.get(payload.name)
          );
          done();
        });
    });
  });
});
