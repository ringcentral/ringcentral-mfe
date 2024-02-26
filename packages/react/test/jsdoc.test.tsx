/* eslint-disable react/function-component-definition */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import { jsdocTests } from 'jsdoc-tests';
import { render } from '@testing-library/react';
import { identifierContainer } from '@ringcentral/mfe-shared';

const mock = () => {
  global.mockImport = (name: string) =>
    Promise.resolve({
      default: {
        render: (element?: HTMLElement | null) => {
          const App2Component = () => <div>test</div>;
          render(<App2Component />, {
            container: element ?? document.body,
          });
          return () => {
            //
          };
        },
      },
    });
};

beforeEach(() => {
  mock();
});

test('basic useApp()', async () => {
  await jsdocTests('../src/useApp.tsx', __dirname);
});

test('basic useWebComponents()', async () => {
  await jsdocTests('../src/useWebComponents.tsx', __dirname);
});

test('basic useIframe()', async () => {
  const mockMeta = () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global[identifierContainer] = {
      prefix: '*',
      styles: {},
      renderContainers: {},
      modules: {
        '@example/app1': {
          name: '@example/app1',
          registry: 'http://localhost:3000/app1-registry.json',
          dependencies: {
            '@example/app2': {
              entry: 'http://localhost:3002/remoteEntry.js?remote=true',
              version: '*',
            },
            '@example/app3': {
              entry: 'http://localhost:3003/remoteEntry.js?remote=true',
              version: '*',
            },
          },
          exposes: { './src/bootstrap': './src/bootstrap' },
          version: '0.1.0-alpha.0',
        },
        '@example/app2': {
          name: '@example/app2',
          registry: 'http://localhost:3000/app2-registry.json',
          dependencies: {
            '@example/app3': {
              entry: 'http://localhost:3003/remoteEntry.js',
              version: '*',
            },
          },
          exposes: { './src/bootstrap': './src/bootstrap' },
          version: '0.1.0-alpha.0',
        },
        '@example/app3': {
          name: '@example/app3',
          exposes: { './src/bootstrap': './src/bootstrap' },
          version: '0.1.0-alpha.0',
        },
      },
    };
  };
  mockMeta();
  await jsdocTests('../src/useIframe.tsx', __dirname);
});
