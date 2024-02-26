/* eslint-disable import/no-relative-packages */
/* eslint-disable react/function-component-definition */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable import/no-extraneous-dependencies */
import React, { useEffect, useState } from 'react';
import {
  render,
  fireEvent,
  screen,
  act,
  configure,
} from '@testing-library/react';
import { identifierContainer } from '@ringcentral/mfe-shared';

import App1 from '../base/app1/src/App';

configure({ testIdAttribute: 'rc-mfe' });

const mockMeta = () => {
  // @ts-ignore
  global.isIT = true;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  global[identifierContainer] = {
    prefix: '*',
    main: '@base/app1',
    registry: 'http://localhost:4000/app1-registry.json',
    version: '0.1.0-alpha.0',
    toBeResolved: [],
    modules: {
      '@base/app1': {
        name: '@base/app1',
        registry: 'http://localhost:4000/app1-registry.json',
        dependencies: {
          '@base/app2': {
            entry: 'http://localhost:4002/remoteEntry.js',
            version: '*',
          },
        },
        exposes: { './src/bootstrap': './src/bootstrap' },
        version: '0.1.0-alpha.0',
      },
    },
    renderContainers: {
      'rc-mfe:@base/app2-b6jkt61td2': {
        name: '@base/app2',
        type: 'react-useApp',
        timestamp: 1673401334292,
      },
    },
    styles: {
      '@base/app1': { elements: [{}], targets: [] },
      '@base/app2': { elements: [], targets: [] },
    },
    entry: 'http://localhost:4001/#/',
    enableCssIsolation: true,
  };
};

test('basic SPA mode', async () => {
  mockMeta();
  render(<App1 />);
  await act(() => Promise.resolve());
  expect(
    screen.queryByText('App1 using native dynamic import to load App2')
  ).toBeInTheDocument();
  const button = screen.queryByText('App 2 Button with count(0)');
  expect(button).toBeInTheDocument();
  await button!.click();
  await act(() => Promise.resolve());
  expect(screen.queryByText('App 2 Button with count(1)')).toBeInTheDocument();
});
