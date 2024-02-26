/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { getBannerScript } from '../src/ModuleFederationPlugin';

beforeEach(() => {
  // @ts-ignore
  delete global.__RC_MFE__;
});

test('check getBannerScript() with jsonp', () => {
  const mfeConfig = {
    name: '@example/app1',
    registry: 'http://localhost:3000/app1-registry.js',
    registryType: 'jsonp',
    dependencies: {
      '@example/app2': {
        entry: 'http://localhost:3002/remoteEntry.js',
        version: '*',
      },
      '@example/app3': {
        entry: 'http://localhost:3003/remoteEntry.js',
        version: '*',
      },
    },
    exposes: {
      './src/bootstrap': './src/bootstrap',
    },
  } as any;
  expect(() => {
    // eslint-disable-next-line no-eval
    eval(
      `${getBannerScript({
        identifierContainer: '__RC_MFE__',
        mfeConfig,
        identifier: 'test',
        maxRetries: 1,
        retryDelay: 1,
      })}`
    );
  }).not.toThrowError();

  expect(global.__RC_MFE__).toMatchInlineSnapshot(`
    {
      "_onUpdateStorage": Set {},
      "_toBeResolvedUpdateStorage": Set {},
      "_updateStorage": Set {},
      "defaultMode": "*",
      "dynamicImport": [Function],
      "loads": {},
      "main": "@example/app1",
      "modules": {
        "@example/app1": {
          "dependencies": {
            "@example/app2": {
              "entry": "http://localhost:3002/remoteEntry.js",
              "version": "*",
            },
            "@example/app3": {
              "entry": "http://localhost:3003/remoteEntry.js",
              "version": "*",
            },
          },
          "exposes": {
            "./src/bootstrap": "./src/bootstrap",
          },
          "name": "@example/app1",
          "registry": "http://localhost:3000/app1-registry.js",
          "registryType": "jsonp",
        },
      },
      "prefix": "*",
      "registry": "http://localhost:3000/app1-registry.js",
      "registryAutoFetch": false,
      "registryType": "jsonp",
      "renderContainers": {},
      "storage": Storage {},
      "styles": {},
      "toBeResolved": [],
      "version": "*",
    }
  `);
  expect(() => {
    global.__RC_MFE__.dynamicImport({
      dependency: '@example/app2',
      defaultRemote: 'http://localhost:3002/remoteEntry.js',
      name: '@example/app1',
      version: '',
      dependencyVersion: '*',
    });
  }).not.toThrowError();
});

test('check getBannerScript() with fetch()', () => {
  const mfeConfig = {
    name: '@example/app1',
    registry: 'http://localhost:3000/app1-registry.json',
    dependencies: {
      '@example/app2': {
        entry: 'http://localhost:3002/remoteEntry.js',
        version: '*',
      },
      '@example/app3': {
        entry: 'http://localhost:3003/remoteEntry.js',
        version: '*',
      },
    },
    exposes: {
      './src/bootstrap': './src/bootstrap',
    },
  } as any;
  expect(() => {
    // eslint-disable-next-line no-eval
    eval(
      `const fetch = () => Promise.resolve({ json: () => Promise.resolve() });${getBannerScript(
        {
          identifierContainer: '__RC_MFE__',
          mfeConfig,
          identifier: 'test',
          maxRetries: 1,
          retryDelay: 1,
        }
      )}`
    );
  }).not.toThrowError();

  expect(global.__RC_MFE__).toMatchInlineSnapshot(`
    {
      "_onUpdateStorage": Set {},
      "_toBeResolvedUpdateStorage": Set {},
      "_updateStorage": Set {},
      "defaultMode": "*",
      "dynamicImport": [Function],
      "loads": {},
      "main": "@example/app1",
      "modules": {
        "@example/app1": {
          "dependencies": {
            "@example/app2": {
              "entry": "http://localhost:3002/remoteEntry.js",
              "version": "*",
            },
            "@example/app3": {
              "entry": "http://localhost:3003/remoteEntry.js",
              "version": "*",
            },
          },
          "exposes": {
            "./src/bootstrap": "./src/bootstrap",
          },
          "name": "@example/app1",
          "registry": "http://localhost:3000/app1-registry.json",
        },
      },
      "prefix": "*",
      "registry": "http://localhost:3000/app1-registry.json",
      "registryAutoFetch": false,
      "registryType": "fetch",
      "renderContainers": {},
      "storage": Storage {},
      "styles": {},
      "toBeResolved": [],
      "version": "*",
    }
  `);
  expect(() => {
    global.__RC_MFE__.dynamicImport({
      dependency: '@example/app2',
      defaultRemote: 'http://localhost:3002/remoteEntry.js',
      name: '@example/app1',
      version: '',
      dependencyVersion: '*',
    });
  }).not.toThrowError();
});

test('check getBannerScript() without registry', () => {
  const mfeConfig = {
    name: '@example/app1',
    dependencies: {
      '@example/app2': {
        entry: 'http://localhost:3002/remoteEntry.js',
        version: '*',
      },
      '@example/app3': {
        entry: 'http://localhost:3003/remoteEntry.js',
        version: '*',
      },
    },
    exposes: {
      './src/bootstrap': './src/bootstrap',
    },
  } as any;
  expect(() => {
    // eslint-disable-next-line no-eval
    eval(
      getBannerScript({
        identifierContainer: '__RC_MFE__',
        mfeConfig,
        identifier: 'test',
        maxRetries: 1,
        retryDelay: 1,
      })
    );
  }).not.toThrowError();

  expect(global.__RC_MFE__).toMatchInlineSnapshot(`
    {
      "_onUpdateStorage": Set {},
      "_toBeResolvedUpdateStorage": Set {},
      "_updateStorage": Set {},
      "defaultMode": "*",
      "dynamicImport": [Function],
      "loads": {},
      "main": "@example/app1",
      "modules": {
        "@example/app1": {
          "dependencies": {
            "@example/app2": {
              "entry": "http://localhost:3002/remoteEntry.js",
              "version": "*",
            },
            "@example/app3": {
              "entry": "http://localhost:3003/remoteEntry.js",
              "version": "*",
            },
          },
          "exposes": {
            "./src/bootstrap": "./src/bootstrap",
          },
          "name": "@example/app1",
        },
      },
      "prefix": "*",
      "registry": "*",
      "registryAutoFetch": false,
      "registryType": "fetch",
      "renderContainers": {},
      "storage": Storage {},
      "styles": {},
      "toBeResolved": [],
      "version": "*",
    }
  `);
  expect(() => {
    global.__RC_MFE__.dynamicImport({
      dependency: '@example/app2',
      defaultRemote: 'http://localhost:3002/remoteEntry.js',
      name: '@example/app1',
      version: '',
      dependencyVersion: '*',
    });
  }).not.toThrowError();
});
