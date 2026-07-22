import {
  getDtsPluginOptions,
  getModuleFederationConfig,
} from '../src/getConfig';
import type {
  DtsConsumeTypesOptions,
  SiteConfig,
} from '@ringcentral/mfe-shared';

const consumeTypesOf = (config: SiteConfig): DtsConsumeTypesOptions => {
  const resolved = getDtsPluginOptions(config);
  return resolved?.consumeTypes as DtsConsumeTypesOptions;
};

test('returns undefined when dts is unset', () => {
  expect(
    getDtsPluginOptions({ name: '@x/host', dependencies: {} } as SiteConfig)
  ).toBeUndefined();
});

test('derives remoteTypeUrls from a string-entry dependency', () => {
  const consumeTypes = consumeTypesOf({
    name: '@x/host',
    dependencies: {
      '@x/remote': {
        entry: 'http://localhost:3002/remoteEntry.js',
        version: '*',
      },
    },
    dts: {},
  } as SiteConfig);
  expect(consumeTypes.typesOnBuild).toBe(true);
  expect(consumeTypes.remoteTypeUrls).toEqual({
    '@x/remote': {
      alias: '@x/remote',
      zip: 'http://localhost:3002/@mf-types.zip',
      api: 'http://localhost:3002/@mf-types.d.ts',
    },
  });
});

test('strips a nested path segment when deriving the base', () => {
  const consumeTypes = consumeTypesOf({
    dependencies: {
      '@x/remote': {
        entry: 'https://cdn.example.com/apps/remote/remoteEntry.js',
      },
    },
    dts: {},
  } as unknown as SiteConfig);
  const urls = consumeTypes.remoteTypeUrls as Record<
    string,
    { zip: string; api: string }
  >;
  expect(urls['@x/remote'].zip).toBe(
    'https://cdn.example.com/apps/remote/@mf-types.zip'
  );
  expect(urls['@x/remote'].api).toBe(
    'https://cdn.example.com/apps/remote/@mf-types.d.ts'
  );
});

test('a user-supplied remoteTypeUrls entry wins over the derived one', () => {
  const custom = {
    alias: '@x/remote',
    zip: 'https://custom.example.com/types.zip',
    api: 'https://custom.example.com/types.d.ts',
  };
  const consumeTypes = consumeTypesOf({
    dependencies: {
      '@x/remote': { entry: 'http://localhost:3002/remoteEntry.js' },
    },
    dts: { consumeTypes: { remoteTypeUrls: { '@x/remote': custom } } },
  } as unknown as SiteConfig);
  expect(
    (consumeTypes.remoteTypeUrls as Record<string, unknown>)['@x/remote']
  ).toEqual(custom);
});

test('does not turn consuming on when the user opted out', () => {
  const resolved = getDtsPluginOptions({
    dependencies: {
      '@x/remote': { entry: 'http://localhost:3002/remoteEntry.js' },
    },
    dts: { generateTypes: true, consumeTypes: false },
  } as unknown as SiteConfig);
  expect(resolved?.consumeTypes).toBe(false);
});

test('passes producer generateTypes options (incl. outputDir) through untouched', () => {
  const generateTypes = {
    tsConfigPath: './tsconfig.types.json',
    outputDir: 'dist/remote',
    additionalFilesToCompile: ['./src/public.ts'],
  };
  const resolved = getDtsPluginOptions({
    dependencies: {},
    dts: { generateTypes },
  } as unknown as SiteConfig);
  expect(resolved?.generateTypes).toEqual(generateTypes);
});

test('getModuleFederationConfig never emits dts/dev/runtimePlugins', () => {
  const cfg = getModuleFederationConfig({
    name: '@x/host',
    exposes: { './bootstrap': './src/bootstrap' },
    dependencies: {
      '@x/remote': { entry: 'http://localhost:3002/remoteEntry.js' },
    },
  } as unknown as SiteConfig);
  expect(cfg).not.toHaveProperty('dts');
  expect(cfg).not.toHaveProperty('dev');
  expect(cfg).not.toHaveProperty('runtimePlugins');
});
