/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable guard-for-in */
/* eslint-disable @typescript-eslint/ban-types */
import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  loadApp,
  ExposeOptions,
  defineCustomElement,
  uuid,
  identifierAttribute,
  customElementName,
  onUnmount,
  onMounted,
  onWillMount,
} from '@ringcentral/mfe-core';
import { AppWrapper, UseWebComponents } from './interface';
import { RenderType } from './constants';

/**
 * Render app as Web Components
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
 * import { useWebComponents } from '@ringcentral/mfe-react';
 *
 * export default async () => {
 *   const App1 = () => {
 *     const App2 = useWebComponents({
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
export const useWebComponents: UseWebComponents = ({
  name,
  shadowMode,
  useShadowDOM,
  loader,
  attrs,
  props,
  bootstrap,
}): any => {
  const ModuleRef = useRef<{ default: ExposeOptions } | null>(null);
  const idRef = useRef<string>(uuid(name));
  const domRef = useRef<any>(null);
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
        setLoaded(true);
      })
      .catch((e) => {
        console.error(e);
        setLoaded(null);
      });
  }, []);
  const App: AppWrapper<{}> = useCallback(
    memo((_props?: Record<string, unknown>) => {
      useEffect(() => {
        const { renderNode, injectedRoot } = defineCustomElement({
          name,
          shadowMode,
          useShadowDOM,
          customElement: domRef.current,
        });
        let callback: void | (() => void);
        const { init, render } = ModuleRef!.current!.default;
        Promise.resolve().then(() => {
          const attributes: Record<string, any> = attrs ?? {};
          for (const key in attributes) {
            renderNode.setAttribute(key, attributes[key]);
          }
          const result = bootstrap
            ? bootstrap(ModuleRef!.current!.default as any)
            : init?.();
          const _render = () => {
            onWillMount({ target: injectedRoot, name, id: idRef.current });
            callback = render(
              renderNode,
              {
                ...props,
                ..._props,
              },
              idRef.current
            );
            onMounted({
              target: injectedRoot,
              name,
              id: idRef.current,
              type: RenderType.WebComponents,
            });
          };
          if (result instanceof Promise) {
            result.then(_render);
            return;
          }
          _render();
        });
        return () => {
          onUnmount({ target: injectedRoot, name, id: idRef.current });
          callback?.();
        };
      }, []);
      return React.createElement(customElementName, {
        ref: domRef,
        [identifierAttribute]: idRef.current,
      });
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
