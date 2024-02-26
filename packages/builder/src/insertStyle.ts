/* eslint-disable @typescript-eslint/triple-slash-reference */
/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference path='../../../global.d.ts'/>

import type { InsertedStyle } from '@ringcentral/mfe-shared';

/**
 * use for `style-loader` options.insert or `MiniCssExtractPlugin` options.insert
 */
export const insertStyle = (element: HTMLStyleElement | HTMLLinkElement) => {
  if (!window.__RC_MFE_USE_LOADER__ || !window.__RC_MFE__) {
    const head = document.querySelector('head')!;
    const lastInsertedElement = window._lastElementInsertedByStyleLoader;
    if (!lastInsertedElement) {
      head.insertBefore(element, head.firstChild);
    } else if (lastInsertedElement.nextSibling) {
      head.insertBefore(element, lastInsertedElement.nextSibling);
    } else {
      head.appendChild(element);
    }

    window._lastElementInsertedByStyleLoader = element;
    return;
  }
  window.__RC_MFE__.enableCssIsolation =
    window.__RC_MFE__.enableCssIsolation ?? true;
  // Some plugins require that they be injected first,
  // such as `mini-css-extract-plugin`/`extract-css-chunks-webpack-plugin`.
  if (element.tagName === 'LINK') {
    document.head.appendChild(element);
  }

  const name = process.env.MFE;
  if (!name) {
    throw new Error(
      `[MFE] 'process.env.MFE' is not defined, make sure to use 'ModuleFederationPlugin' in '@ringcentral/mfe-builder'.`
    );
  }
  const { styles } = window.__RC_MFE__;
  styles[name] = styles[name] || {};
  const insertedStyle: InsertedStyle = styles[name];
  insertedStyle.elements ??= [];
  insertedStyle.targets ??= [];
  insertedStyle.elements.push(element);
  insertedStyle.targets.forEach((target) => {
    for (const item of Array.from(target.childNodes)) {
      if (
        ((element as HTMLStyleElement).tagName === 'STYLE' &&
          (item as HTMLStyleElement).tagName === 'STYLE' &&
          (item as HTMLStyleElement).innerText === element.innerText) ||
        ((element as HTMLLinkElement).tagName === 'LINK' &&
          (item as HTMLLinkElement).tagName === 'LINK' &&
          (item as HTMLLinkElement).href === (element as HTMLLinkElement).href)
      ) {
        return;
      }
    }
    target.appendChild(element);
  });
};
