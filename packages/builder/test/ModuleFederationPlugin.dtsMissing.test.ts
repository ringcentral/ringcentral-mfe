import { container } from 'webpack';
import type { Compiler } from 'webpack';
import { getSiteConfig } from '../src/getConfig';
import { ModuleFederationPlugin } from '../src/ModuleFederationPlugin';

// Keep the real native-config builders; only the file-reading getSiteConfig is
// stubbed so the test can inject a dts-enabled config without a fixture file.
jest.mock('../src/getConfig', () => ({
  ...jest.requireActual('../src/getConfig'),
  getSiteConfig: jest.fn(),
}));
// Simulate the optional peer being absent: requiring it fails with the same
// error shape Node throws when a module cannot be resolved.
jest.mock('@module-federation/dts-plugin', () => {
  const error: NodeJS.ErrnoException = new Error(
    "Cannot find module '@module-federation/dts-plugin'"
  );
  error.code = 'MODULE_NOT_FOUND';
  throw error;
});

const mockedGetSiteConfig = getSiteConfig as jest.Mock;

let superApplySpy: jest.SpyInstance;

beforeEach(() => {
  superApplySpy = jest
    .spyOn(container.ModuleFederationPlugin.prototype, 'apply')
    .mockImplementation(() => undefined);
});

afterEach(() => {
  superApplySpy.mockRestore();
});

test('apply throws a clear opt-in error when @module-federation/dts-plugin is not installed', () => {
  mockedGetSiteConfig.mockReturnValue({
    name: '@example/host',
    exposes: { './bootstrap': './src/bootstrap' },
    dependencies: {
      '@example/remote': {
        entry: 'http://localhost:3002/remoteEntry.js',
        version: '*',
      },
    },
    dts: { generateTypes: true },
  });
  const plugin = new ModuleFederationPlugin();
  (plugin as unknown as { bannerPlugin: { apply: jest.Mock } }).bannerPlugin = {
    apply: jest.fn(),
  };
  (plugin as unknown as { definePlugin: { apply: jest.Mock } }).definePlugin = {
    apply: jest.fn(),
  };
  let thrown: Error | undefined;
  try {
    plugin.apply({} as Compiler);
  } catch (e) {
    thrown = e as Error;
  }
  expect(thrown).toBeDefined();
  expect(thrown?.message).toMatch(/@module-federation\/dts-plugin/);
  expect(thrown?.message).toMatch(/Node >=20\.18\.1/);
});
