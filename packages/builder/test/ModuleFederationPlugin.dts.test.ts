import { container } from 'webpack';
import { DtsPlugin } from '@module-federation/dts-plugin';
import type { Compiler } from 'webpack';
import { getSiteConfig } from '../src/getConfig';
import { getEnv } from '../src/getEnv';
import { ModuleFederationPlugin } from '../src/ModuleFederationPlugin';

// Keep the real native-config builders; only the file-reading getSiteConfig is
// stubbed so each test can inject a site config without a fixture file.
jest.mock('../src/getConfig', () => ({
  ...jest.requireActual('../src/getConfig'),
  getSiteConfig: jest.fn(),
}));
jest.mock('../src/getEnv', () => ({ getEnv: jest.fn(() => ({})) }));
jest.mock('@module-federation/dts-plugin', () => ({
  DtsPlugin: jest.fn().mockImplementation(() => ({ apply: jest.fn() })),
}));

const mockedGetSiteConfig = getSiteConfig as jest.Mock;
const mockedGetEnv = getEnv as jest.Mock;
const mockedDtsPlugin = DtsPlugin as unknown as jest.Mock;

const baseSiteConfig = () => ({
  name: '@example/host',
  exposes: { './bootstrap': './src/bootstrap' },
  dependencies: {
    '@example/remote': {
      entry: 'http://localhost:3002/remoteEntry.js',
      version: '*',
    },
  },
});

let superApplySpy: jest.SpyInstance;

beforeEach(() => {
  mockedDtsPlugin.mockClear();
  mockedGetEnv.mockReturnValue({});
  // Stub the native federation apply so no real compiler is required.
  superApplySpy = jest
    .spyOn(container.ModuleFederationPlugin.prototype, 'apply')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  superApplySpy.mockRestore();
});

const buildPlugin = () => {
  const plugin = new ModuleFederationPlugin();
  // Replace the webpack sub-plugins so apply() needs no real compiler.
  (plugin as unknown as { bannerPlugin: { apply: jest.Mock } }).bannerPlugin = {
    apply: jest.fn(),
  };
  (plugin as unknown as { definePlugin: { apply: jest.Mock } }).definePlugin = {
    apply: jest.fn(),
  };
  return plugin;
};

test('dts unset: super() options carry no dts/dev/runtimePlugins and no DtsPlugin is applied', () => {
  mockedGetSiteConfig.mockReturnValue(baseSiteConfig());
  const plugin = buildPlugin();
  const superOptions = (plugin as unknown as { _options: object })._options;
  expect(superOptions).not.toHaveProperty('dts');
  expect(superOptions).not.toHaveProperty('dev');
  expect(superOptions).not.toHaveProperty('runtimePlugins');
  plugin.apply({} as Compiler);
  expect(mockedDtsPlugin).not.toHaveBeenCalled();
});

test('dts set (non-SPA): DtsPlugin applied with dev:false and the resolved dts; super() stays clean', () => {
  mockedGetSiteConfig.mockReturnValue({
    ...baseSiteConfig(),
    dts: { generateTypes: true, consumeTypes: true },
  });
  const plugin = buildPlugin();
  expect(
    (plugin as unknown as { _options: object })._options
  ).not.toHaveProperty('dts');
  plugin.apply({} as Compiler);
  expect(mockedDtsPlugin).toHaveBeenCalledTimes(1);
  const arg = mockedDtsPlugin.mock.calls[0][0];
  expect(arg.name).toBe('@example/host');
  expect(arg.dev).toBe(false);
  expect(arg.dts.consumeTypes.remoteTypeUrls['@example/remote']).toEqual({
    alias: '@example/remote',
    zip: 'http://localhost:3002/@mf-types.zip',
    api: 'http://localhost:3002/@mf-types.d.ts',
  });
});

test('SPA build: DtsPlugin is not applied even when dts is set', () => {
  mockedGetSiteConfig.mockReturnValue({
    ...baseSiteConfig(),
    dts: { generateTypes: true },
  });
  mockedGetEnv.mockReturnValue({ spa: true });
  const plugin = buildPlugin();
  plugin.apply({} as Compiler);
  expect(superApplySpy).not.toHaveBeenCalled();
  expect(mockedDtsPlugin).not.toHaveBeenCalled();
});
