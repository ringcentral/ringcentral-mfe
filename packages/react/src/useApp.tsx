/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  uuid,
  loadApp,
  ExposeOptions,
  identifierAttribute,
  onUnmount,
  onMounted,
  onWillMount,
} from '@ringcentral/mfe-core';
import { AppWrapper, UseApp } from './interface';
import { RenderType } from './constants';

/**
 * Render app as React component
 *
 * Their rendering is isolated,
 * and any re-rendering of the parent component will not trigger an MFE re-render,
 * unless the parent component is unmounted and re-mounted.
 *
 * @example
 *
 * ```ts
 * import React from 'react';
 * import { render, screen, act } from '@testing-library/react';
 * import { useApp } from '@ringcentral/mfe-react';
 *
 * export default async () => {
 *   const App1 = () => {
 *     const App2 = useApp({
 *       name: '@example/app2',
 *       loader: () => global.mockImport('@example/app2'),
 *     });
 *     return <App2 />;
 *   };
 *   render(<App1 />);
 *   await act(() => Promise.resolve());
 *   expect(screen.queryByText('test')).toBeInTheDocument();
 * }
 * ```
 */
export const useApp: UseApp = ({
  name,
  loader,
  props,
  attrs,
  bootstrap,
}): any => {
  const ModuleRef = useRef<{ default: ExposeOptions } | null>(null);
  const [loaded, setLoaded] = useState<boolean | null>(false);
  useEffect(() => {
    loadApp(loader, name)
      .then((module: { default: ExposeOptions }) => {
        ModuleRef.current = module;
        if (typeof ModuleRef!.current?.default === 'undefined') {
          throw new Error(
            `[MFE] '${name}' app should export default exposed API.`
          );
        }
        // When using @testing-library/react, the state of the currently loaded module must not be updated until after the function has been executed,
        // otherwise the internal state of the component will not be updated when the component is rendered.
        setLoaded(true);
      })
      .catch((e) => {
        console.error(e);
        setLoaded(null);
      });
  }, []);
  const App: AppWrapper<{}> = useCallback(
    memo((_props?: Record<string, unknown>) => {
      const rootRef = useRef<HTMLDivElement>(null);
      const renderRef = useRef<HTMLDivElement>(null);
      const idRef = useRef<string>(uuid(name));
      useEffect(() => {
        let callback: void | (() => void);
        const { init, render } = ModuleRef!.current!.default;
        Promise.resolve().then(() => {
          const result = bootstrap
            ? bootstrap(ModuleRef!.current!.default as any)
            : init?.();
          const _render = () => {
            onWillMount({ target: rootRef.current!, name, id: idRef.current });
            callback = render(
              renderRef.current,
              {
                ...props,
                ..._props,
              },
              idRef.current
            );
            onMounted({
              target: rootRef.current!,
              name,
              id: idRef.current,
              type: RenderType.App,
            });
          };
          if (result instanceof Promise) {
            result.then(_render);
            return;
          }
          _render();
        });
        return () => {
          onUnmount({ target: rootRef.current!, name, id: idRef.current });
          callback?.();
        };
      }, []);
      return (
        <div
          ref={rootRef}
          {...{ ...attrs, [identifierAttribute]: idRef.current }}
        >
          <div ref={renderRef} />
        </div>
      );
    }),
    [loaded]
  );
  return loaded
    ? App
    : loaded === null
    ? ((({ fallback: Fallback }) =>
        Fallback ? <Fallback /> : null) as AppWrapper<{}>)
    : ((({ loading: Loading }) =>
        Loading ? <Loading /> : null) as AppWrapper<{}>);
};
