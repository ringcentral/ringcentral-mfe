import {
  getDtsPluginOptions,
  getModuleFederationConfig,
} from '../src/getConfig';
import type {
  DtsConsumeTypesOptions,
  RemoteTypeUrls,
  SiteConfig,
} from '@ringcentral/mfe-shared';

const consumeTypesOf = (config: SiteConfig): DtsConsumeTypesOptions => {
  const resolved = getDtsPluginOptions(config);
  return resolved?.consumeTypes as DtsConsumeTypesOptions;
};

const urlsOf = (consumeTypes: DtsConsumeTypesOptions) =>
  consumeTypes.remoteTypeUrls as Record<
    string,
    { alias?: string; zip: string; api: string }
  >;

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
  const urls = urlsOf(consumeTypes);
  expect(urls['@x/remote'].zip).toBe(
    'https://cdn.example.com/apps/remote/@mf-types.zip'
  );
  expect(urls['@x/remote'].api).toBe(
    'https://cdn.example.com/apps/remote/@mf-types.d.ts'
  );
});

test('derives a correct base for bare-origin and query-string entries', () => {
  const consumeTypes = consumeTypesOf({
    dependencies: {
      bare: { entry: 'https://host.com' },
      query: { entry: 'https://host.com/app/remoteEntry.js?path=/a/b' },
      trailing: { entry: 'https://host.com/app/' },
    },
    dts: {},
  } as unknown as SiteConfig);
  const urls = urlsOf(consumeTypes);
  expect(urls.bare.zip).toBe('https://host.com/@mf-types.zip');
  expect(urls.query.zip).toBe('https://host.com/app/@mf-types.zip');
  expect(urls.trailing.zip).toBe('https://host.com/app/@mf-types.zip');
});

test('skips an unparsable entry but keeps the valid ones', () => {
  const consumeTypes = consumeTypesOf({
    dependencies: {
      good: { entry: 'http://host/remoteEntry.js' },
      bad: { entry: 'not a url' },
    },
    dts: {},
  } as unknown as SiteConfig);
  const urls = urlsOf(consumeTypes);
  expect(urls.good).toBeDefined();
  expect(urls.bad).toBeUndefined();
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
  expect(urlsOf(consumeTypes)['@x/remote']).toEqual(custom);
});

test('a user entry without alias keeps the derived alias (the remote name)', () => {
  const consumeTypes = consumeTypesOf({
    dependencies: {
      '@x/remote': { entry: 'http://localhost:3002/remoteEntry.js' },
    },
    dts: {
      consumeTypes: {
        remoteTypeUrls: {
          '@x/remote': {
            zip: 'https://custom.example.com/types.zip',
            api: 'https://custom.example.com/types.d.ts',
          },
        },
      },
    },
  } as unknown as SiteConfig);
  const entry = urlsOf(consumeTypes)['@x/remote'];
  expect(entry.alias).toBe('@x/remote');
  expect(entry.zip).toBe('https://custom.example.com/types.zip');
  expect(entry.api).toBe('https://custom.example.com/types.d.ts');
});

test('a user-supplied function resolver passes through untouched', () => {
  const resolver = async (): Promise<RemoteTypeUrls> => ({});
  const consumeTypes = consumeTypesOf({
    dependencies: {
      '@x/remote': { entry: 'http://localhost:3002/remoteEntry.js' },
    },
    dts: { consumeTypes: { remoteTypeUrls: resolver } },
  } as unknown as SiteConfig);
  expect(consumeTypes.remoteTypeUrls).toBe(resolver);
});

test('consumeTypes: true is normalized to an object with derived remoteTypeUrls', () => {
  const consumeTypes = consumeTypesOf({
    dependencies: {
      '@x/remote': { entry: 'http://localhost:3002/remoteEntry.js' },
    },
    dts: { consumeTypes: true },
  } as unknown as SiteConfig);
  expect(consumeTypes.typesOnBuild).toBe(true);
  expect(urlsOf(consumeTypes)['@x/remote'].zip).toBe(
    'http://localhost:3002/@mf-types.zip'
  );
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

test('getModuleFederationConfig strips dts from the native options', () => {
  const cfg = getModuleFederationConfig({
    name: '@x/host',
    exposes: { './bootstrap': './src/bootstrap' },
    dependencies: {
      '@x/remote': { entry: 'http://localhost:3002/remoteEntry.js' },
    },
    dts: {},
  } as unknown as SiteConfig);
  expect(cfg).not.toHaveProperty('dts');
});

describe('registry-aware remoteTypeUrls resolver', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('resolves remoteTypeUrls from the registry-resolved entry', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      json: async () => ({
        '@x/remote': {
          entry: 'https://cdn.example.com/v2/remote/remoteEntry.js',
        },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const consumeTypes = consumeTypesOf({
      name: '@x/host',
      version: '1.2.3',
      registry: 'https://registry.example.com/lookup',
      registryAutoFetch: true,
      dependencies: {
        '@x/remote': {
          entry: 'https://cdn.example.com/v1/remote/remoteEntry.js',
        },
      },
      dts: {},
    } as unknown as SiteConfig);
    expect(typeof consumeTypes.remoteTypeUrls).toBe('function');

    const urls = await (
      consumeTypes.remoteTypeUrls as () => Promise<RemoteTypeUrls>
    )();
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('https://registry.example.com/lookup?');
    expect(calledUrl).toContain('dependency=%40x%2Fremote');
    expect(calledUrl).toContain('main=%40x%2Fhost');
    expect(calledUrl).toContain('mainVersion=1.2.3');
    // the query carries the consumer's version, not the remote's
    expect(calledUrl).toContain('version=1.2.3');
    // derived from the registry entry (v2), not the static entry (v1)
    expect(urls['@x/remote'].zip).toBe(
      'https://cdn.example.com/v2/remote/@mf-types.zip'
    );
  });

  test('keeps the static URL when the registry entry does not satisfy the version', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        '@x/remote': {
          entry: 'https://cdn.example.com/v2/remote/remoteEntry.js',
          version: '2.0.0',
        },
      }),
    }) as unknown as typeof fetch;
    const consumeTypes = consumeTypesOf({
      name: '@x/host',
      registry: 'https://registry.example.com/lookup',
      registryAutoFetch: true,
      dependencies: {
        '@x/remote': {
          entry: 'https://cdn.example.com/v1/remote/remoteEntry.js',
          dependencyVersion: '^1.0.0',
        },
      },
      dts: {},
    } as unknown as SiteConfig);
    const urls = await (
      consumeTypes.remoteTypeUrls as () => Promise<RemoteTypeUrls>
    )();
    // 2.0.0 does not satisfy ^1.0.0 -> keep the static (v1) URL
    expect(urls['@x/remote'].zip).toBe(
      'https://cdn.example.com/v1/remote/@mf-types.zip'
    );
  });

  test('falls back to the static URL when the registry fetch fails', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    const consumeTypes = consumeTypesOf({
      name: '@x/host',
      registry: 'https://registry.example.com/lookup',
      registryAutoFetch: true,
      dependencies: {
        '@x/remote': {
          entry: 'https://cdn.example.com/v1/remote/remoteEntry.js',
        },
      },
      dts: {},
    } as unknown as SiteConfig);
    const urls = await (
      consumeTypes.remoteTypeUrls as () => Promise<RemoteTypeUrls>
    )();
    expect(urls['@x/remote'].zip).toBe(
      'https://cdn.example.com/v1/remote/@mf-types.zip'
    );
  });

  test('does not use the resolver when registryAutoFetch is not enabled', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const consumeTypes = consumeTypesOf({
      registry: 'https://registry.example.com/lookup',
      dependencies: {
        '@x/remote': {
          entry: 'https://cdn.example.com/v1/remote/remoteEntry.js',
        },
      },
      dts: {},
    } as unknown as SiteConfig);
    expect(typeof consumeTypes.remoteTypeUrls).toBe('object');
    expect(urlsOf(consumeTypes)['@x/remote'].zip).toBe(
      'https://cdn.example.com/v1/remote/@mf-types.zip'
    );
  });

  test('does not use the resolver for a jsonp registry (static object instead)', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const consumeTypes = consumeTypesOf({
      registry: 'https://registry.example.com/lookup',
      registryType: 'jsonp',
      registryAutoFetch: true,
      dependencies: {
        '@x/remote': {
          entry: 'https://cdn.example.com/v1/remote/remoteEntry.js',
        },
      },
      dts: {},
    } as unknown as SiteConfig);
    expect(typeof consumeTypes.remoteTypeUrls).toBe('object');
    expect(urlsOf(consumeTypes)['@x/remote'].zip).toBe(
      'https://cdn.example.com/v1/remote/@mf-types.zip'
    );
  });

  test('does not use the resolver when no registry is configured', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const consumeTypes = consumeTypesOf({
      dependencies: {
        '@x/remote': {
          entry: 'https://cdn.example.com/v1/remote/remoteEntry.js',
        },
      },
      dts: {},
    } as unknown as SiteConfig);
    expect(typeof consumeTypes.remoteTypeUrls).toBe('object');
  });

  test('a user-supplied remoteTypeUrls wins over the registry resolver', () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const consumeTypes = consumeTypesOf({
      registry: 'https://registry.example.com/lookup',
      registryAutoFetch: true,
      dependencies: {
        '@x/remote': {
          entry: 'https://cdn.example.com/v1/remote/remoteEntry.js',
        },
      },
      dts: {
        consumeTypes: {
          remoteTypeUrls: {
            '@x/remote': {
              alias: '@x/remote',
              zip: 'https://custom.example.com/t.zip',
              api: 'https://custom.example.com/t.d.ts',
            },
          },
        },
      },
    } as unknown as SiteConfig);
    expect(typeof consumeTypes.remoteTypeUrls).toBe('object');
    expect(urlsOf(consumeTypes)['@x/remote'].zip).toBe(
      'https://custom.example.com/t.zip'
    );
  });
});
