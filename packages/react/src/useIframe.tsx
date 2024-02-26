/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
/* eslint-disable no-shadow */
/* eslint-disable jsx-a11y/iframe-has-title */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  getIframeUrl,
  uuid,
  identifierAttribute,
  onUnmount,
  onMounted,
  createScopeName,
} from '@ringcentral/mfe-core';
import { UseIframe } from './interface';
import { RenderType } from './constants';

/**
 * Render app in iframe
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
 * import { useIframe } from '@ringcentral/mfe-react';
 *
 * export default async () => {
 *   const App1 = () => {
 *     const App2 = useIframe({
 *       name: '@example/app2',
 *     });
 *     return <App2 />;
 *   };
 *   render(<App1 />);
 *   await act(() => Promise.resolve());
 *   expect(document.querySelector('iframe')!).toBeInTheDocument();
 * }
 * ```
 */
export const useIframe: UseIframe = ({
  name,
  url = '',
  attrs = {},
  ref,
  scope,
}) => {
  const Iframe = useCallback(
    memo(() => {
      const rootRef = useRef<HTMLIFrameElement>(null);
      const [iframeUrl, setIframeUrl] = useState(url);
      const idRef = useRef<string>(uuid(name));
      if (Object.hasOwnProperty.call(attrs, 'src')) {
        console.warn(
          `[MFE] The iframe component of the site named "${name}" does not pass "src" props.`
        );
      }
      useEffect(() => {
        if (ref) {
          Object.assign(ref, {
            current: rootRef.current,
          });
        }
        if (!iframeUrl) {
          getIframeUrl(name).then((_url) => {
            setIframeUrl(_url);
          });
          onMounted({
            target: rootRef.current!,
            name,
            id: idRef.current,
            type: RenderType.Iframe,
          });
        }
        return () => {
          onUnmount({ target: rootRef.current!, name, id: idRef.current });
        };
      }, []);
      const id = uuid(name);
      return (
        <iframe
          ref={rootRef}
          frameBorder="no"
          {...{ ...attrs, [identifierAttribute]: id }}
          src={iframeUrl}
          name={createScopeName(idRef.current, scope)}
        />
      );
    }),
    [name]
  );
  return Iframe;
};
