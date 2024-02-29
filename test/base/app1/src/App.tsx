/* eslint-disable no-shadow */
/* eslint-disable react/no-unstable-nested-components */
// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import {
  useApp as useCommonApp,
  useIframe as useCommonIframe,
  useWebComponents as useCommonWebComponents,
} from '@ringcentral/mfe-core';
import type App2 from 'app2/src/bootstrap';
import {
  useApp,
  useIframe,
  useWebComponents,
  dynamicLoad,
  onUpdateEntry,
} from '@ringcentral/mfe-react';
import { Link, HashRouter, Route, Switch } from 'react-router-dom';
import {
  getGlobalTransport,
  PickListeners,
  MergeInteraction,
} from '@ringcentral/mfe-transport';

(window as any).updateEntryLogs = [];

onUpdateEntry((...data) => {
  console.log('onUpdateEntry', data);
  (window as any).updateEntryLogs.push(data);
});

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
                name: 'app2',
                loader: () => import('app2/src/bootstrap'),
              });
              return (
                <div>
                  App1 using native dynamic import to load App2
                  <App2Component />
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
                dynamicLoad<typeof App2>('app2/src/bootstrap').then(
                  ({ default: { init, render } }) => {
                    init();
                    callback = render(ref.current)!;
                  }
                );
                // useCommonApp({
                //   name: 'app2',
                //   target: ref.current!,
                //   // loader: () => import('app2/src/bootstrap'),
                //   loader: () =>
                //     dynamicLoad<typeof App2>(
                //       'app2/src/bootstrap',
                //       'http://localhost:4002/remoteEntry.js'
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
              //     'http://localhost:4002/remoteEntry.js',
              //     'app2/src/bootstrap'
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
                name: 'app2',
                // loader: () => import('app2/src/bootstrap'),
                loader: () =>
                  dynamicLoad<typeof App2>(
                    'app2/src/bootstrap',
                    'http://localhost:4002/remoteEntry.js'
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
                  name: 'app2',
                  target: ref.current!,
                  attrs: {
                    height: '100%',
                  },
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
                name: 'app2',
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
                  name: 'app2',
                  loader: () => import('app2/src/bootstrap'),
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
                name: 'app2',
                useShadowDOM: true,
                shadowMode: 'closed',
                loader: () => import('app2/src/bootstrap'),
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
