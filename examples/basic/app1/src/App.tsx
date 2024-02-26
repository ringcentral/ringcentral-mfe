/* eslint-disable no-shadow */
/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect, useRef, useState } from 'react';
import {
  useApp as useCommonApp,
  useIframe as useCommonIframe,
  useWebComponents as useCommonWebComponents,
} from '@ringcentral/mfe-core';
import type App2 from '@example/app2/src/bootstrap';
import {
  useApp,
  useIframe,
  useWebComponents,
  dynamicLoad,
  onUpdateEntry,
  getEntry,
  setStorageMode,
  setStorageRegistry,
  removeStorageRegistry,
} from '@ringcentral/mfe-react';
import { Link, HashRouter, Route, Switch } from 'react-router-dom';
import {
  getGlobalTransport,
  MergeInteraction,
  PickListeners,
} from '@ringcentral/mfe-transport';
import {
  useLogger,
  ConsoleTransport,
  StorageTransport,
  ScriptErrorIntegration,
  ConsoleIntegration,
} from '@ringcentral/mfe-logger';

(window as any).setStorageRegistry = setStorageRegistry;
(window as any).removeStorageRegistry = removeStorageRegistry;

(window as any)._log1 = useLogger({
  name: 'app1',
  transports: [
    new ConsoleTransport({
      enabled: true,
    }),
    new StorageTransport({
      enabled: true,
    }),
  ],
  integrations: [
    new ScriptErrorIntegration({
      enabled: true,
    }),
    new ConsoleIntegration({
      enabled: true,
    }),
  ],
  enabled: true,
});

(window as any).getEntry = getEntry;
(window as any).setStorageMode = setStorageMode;

onUpdateEntry((...data) => {
  console.log('onUpdateEntry', data);
});

setTimeout(() => {
  a();
}, 1000);

function a() {
  throw new Error('a1111');
}

const globalTransport = getGlobalTransport<
  MergeInteraction<
    PickListeners<typeof App2>,
    {
      listen: {
        count1: (n: number) => Promise<number>;
      };
    }
  >
>();

const Counter = () => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const removeListener = globalTransport.listen('count1', async (n) => {
      console.log('count1', n, 'from app3');
      setCount((c) => c + 1);
      return n;
    });
    return () => removeListener?.();
  }, []);
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          globalTransport.emit('count', count).then((n) => {
            console.log('count =====>>>>>', n, 'from app3');
          });
        }}
      >
        App1 send to App3 counter({count})
      </button>
    </div>
  );
};

const App = () => {
  return (
    <HashRouter>
      <div>
        <h1>App 1</h1>
        <ul>
          <li>
            <Link to="/">home</Link>
          </li>
          <li>
            <Link to="/use-app">useApp</Link>
          </li>
          <li>
            <Link to="/use-app-with-react">useApp with React</Link>
          </li>
          <li>
            <Link to="/use-iframe">useIframe</Link>
          </li>
          <li>
            <Link to="/use-iframe-with-react">useIframe with React</Link>
          </li>
          <li>
            <Link to="/use-web-components">useWebComponents</Link>
          </li>
          <li>
            <Link to="/use-web-components-with-react">
              useWebComponents with React
            </Link>
          </li>
        </ul>
        <Counter />
        <Switch>
          <Route
            exact
            path="/"
            component={() => {
              const App2Component = useApp({
                name: '@example/app2',
                loader: () => import('@example/app2/src/bootstrap'),
              });
              const App3Component = useApp({
                name: '@example/app3',
                loader: () => import('@example/app3/src/bootstrap'),
              });
              console.log(
                'App1 using native dynamic import to load App2',
                (window as any).__RC_MFE__.modules['@example/app1']
                  .dependencies['@example/app2']
              );
              return (
                <div>
                  App1 using native dynamic import to load App2
                  <App2Component
                    loading={() => {
                      return <div>app2 loading</div>;
                    }}
                    fallback={() => {
                      return <div>app2 error</div>;
                    }}
                  />
                  <App3Component />
                </div>
              );
            }}
          />
          <Route
            path="/use-app"
            component={() => {
              const ref = useRef<HTMLDivElement>(null);
              useEffect(() => {
                let callback: () => void;
                dynamicLoad<typeof App2>('@example/app2/src/bootstrap').then(
                  ({ default: { init, render } }) => {
                    init();
                    callback = render(ref.current)!;
                  }
                );
                // useCommonApp({
                //   name: '@example/app2',
                //   target: ref.current!,
                //   // loader: () => import('@example/app2/src/bootstrap'),
                //   loader: () =>
                //     dynamicLoad<typeof App2>(
                //       '@example/app2/src/bootstrap',
                //       'http://localhost:3002/remoteEntry.js'
                //     ),
                // });
                return () => {
                  callback?.();
                };
              }, []);
              return (
                <div>
                  App1 use common `useApp()`
                  <div ref={ref} />
                </div>
              );
            }}
          />
          <Route
            path="/use-app-with-react"
            component={() => {
              // const ref = useRef<HTMLDivElement>(null);
              // useEffect(() => {
              //   dynamicLoad<typeof App2>(
              //     'http://localhost:3002/remoteEntry.js',
              //     '@example/app2/src/bootstrap'
              //   ).then(({ default: { init, render } }) => {
              //     init();
              //     render(ref.current);
              //   });
              // }, []);
              // return (
              //   <div>
              //     App1 use common `useApp()`
              //     <div ref={ref} />
              //   </div>
              // );

              const App2Component = useApp({
                name: '@example/app2',
                // loader: () => import('@example/app2/src/bootstrap'),
                loader: () =>
                  dynamicLoad<typeof App2>(
                    '@example/app2/src/bootstrap',
                    'http://localhost:3002/remoteEntry.js'
                  ),
              });
              return (
                <div>
                  App1 using `useApp()` React hooks
                  <App2Component />
                </div>
              );
            }}
          />
          <Route
            exact
            path="/use-iframe"
            component={() => {
              const ref = useRef(null);
              useEffect(() => {
                useCommonIframe({
                  name: '@example/app2',
                  target: ref.current!,
                  attrs: {
                    height: '100%',
                  },
                  scope: 'app2',
                });
              }, []);
              return (
                <div>
                  App1 use common `useIframe()`
                  <div ref={ref} />
                </div>
              );
            }}
          />
          <Route
            path="/use-iframe-with-react"
            component={() => {
              const App2Iframe = useIframe({
                name: '@example/app2',
                attrs: {
                  height: '100%',
                },
              });
              return (
                <div>
                  App1 using `useIframe()` React hooks
                  <App2Iframe />
                </div>
              );
            }}
          />
          <Route
            exact
            path="/use-web-components"
            component={() => {
              const ref = useRef<HTMLDivElement>(null);
              useEffect(() => {
                useCommonWebComponents({
                  name: '@example/app2',
                  loader: () => import('@example/app2/src/bootstrap'),
                  target: ref.current!,
                  shadowMode: 'open',
                  useShadowDOM: false,
                });
              }, []);
              return (
                <div>
                  App1 use common `useWebComponents()`
                  <div ref={ref} />
                </div>
              );
            }}
          />
          <Route
            path="/use-web-components-with-react"
            component={() => {
              const App2WebComponentWithReact = useWebComponents({
                name: '@example/app2',
                useShadowDOM: true,
                shadowMode: 'closed',
                loader: () => import('@example/app2/src/bootstrap'),
              });
              return (
                <div>
                  App1 using `useWebComponents()` React hooks
                  <App2WebComponentWithReact />
                </div>
              );
            }}
          />
        </Switch>
      </div>
    </HashRouter>
  );
};

export default App;
