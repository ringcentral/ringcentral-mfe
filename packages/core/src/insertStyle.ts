/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InsertedStyle } from '@ringcentral/mfe-shared';
import { global } from '@ringcentral/mfe-shared';
import { identifierContainer } from './constants';

export const insertStyle = (target: HTMLElement, name: string) => {
  const { styles } = global[identifierContainer];
  styles[name] = styles[name] ?? {};
  const insertedStyle: InsertedStyle = styles[name];
  insertedStyle.elements ??= [];
  insertedStyle.targets ??= [];
  // collections from `style-loader` insert CSS element
  // If using a style dynamic solution, such as `styled-components`, and be sure to use `StyleSheetManager`.
  if (!insertedStyle.targets.includes(target)) {
    insertedStyle.targets.push(target);
  }
  const inserted: Record<string, boolean> = {};
  insertedStyle.elements.forEach((style) => {
    if (style.tagName === 'LINK') {
      try {
        // Remove some of the styles injected in advance, such as `mini-css-extract-plugin`/`extract-css-chunks-webpack-plugin`.
        document.head.removeChild(style);
      } catch (e) {
        console.warn(e);
      }
    }

    const cssKey = (style as HTMLLinkElement).href || style.innerText;
    if (!inserted[cssKey]) {
      inserted[cssKey] = true;
      target.appendChild(style.cloneNode(true));
    }
  });
};
