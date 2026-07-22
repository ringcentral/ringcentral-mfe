/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import path from 'path';
import type {
  SiteConfig,
  Options,
  ModuleFederationConfig,
  SiteConfigFile,
  ModuleFederationPluginOptions,
  PluginDtsOptions,
  DtsConsumeTypesOptions,
  RemoteTypeUrl,
  RemoteTypeUrls,
  RegistryResponse,
} from '@ringcentral/mfe-shared';
import {
  getGlobal,
  identifierContainer,
  isSatisfied,
  satisfiesVersion,
} from '@ringcentral/mfe-shared';
import { getEnv } from './getEnv';
import { makeRemoteScript } from './make';

const DEFAULT_REMOTE_ENTRY = 'remoteEntry.js';

// Conventional Module Federation type-archive filenames emitted next to the
// remote entry by `@module-federation/dts-plugin`.
const MF_TYPES_ZIP = '@mf-types.zip';
const MF_TYPES_API = '@mf-types.d.ts';

// Registry-lookup timeout (ms) so a hanging registry cannot stall the build;
// overridable via `consumeTypes.timeout`. On timeout we fall back to static.
const DEFAULT_REGISTRY_TIMEOUT = 5000;

export const getSiteConfig = ({ overrides = {} }: Options = {}): SiteConfig => {
  // TODO: implement more config options
  const rootPath = overrides.projectRoot || process.cwd();
  try {
    const configFile = path.join(rootPath, 'site.config');
    const rawConfig: SiteConfigFile = require(configFile);
    const config =
      typeof rawConfig === 'object' ? rawConfig : rawConfig(getEnv());
    const {
      $schema,
      dependencies = {},
      ...siteConfig
    }: SiteConfig & {
      $schema?: string;
    } = {
      ...config,
      ...overrides,
    };
    Object.entries(dependencies).forEach(([key, value]) => {
      if (typeof value === 'string') {
        dependencies[key] = {
          entry: value,
          version: '*',
          dependencyVersion: '*',
        };
        return;
      }
      if (typeof value !== 'object' || typeof value.entry !== 'string') {
        throw new Error(
          `[MFE] invalid dependencies config for ${key} in site.config`
        );
      }
      value.dependencyVersion = value.dependencyVersion ?? value.version;
    });
    return {
      ...siteConfig,
      dependencies,
    };
  } catch (e) {
    console.error(`[MFE] make sure to set site config  in ${rootPath}`);
    throw e;
  }
};

export const getModuleFederationConfig = (
  siteConfig: SiteConfig
): ModuleFederationConfig => {
  const {
    version,
    registry,
    registryType,
    registryAutoFetch,
    defaultMode,
    dependencies,
    name: packageName,
    filename = DEFAULT_REMOTE_ENTRY,
    exposes,
    optimization,
    prefix,
    projectRoot,
    dts,
    ...restConfig
  } = siteConfig;
  const remotes: ModuleFederationPluginOptions['remotes'] = {};
  if (__DEV__ && typeof packageName !== 'string') {
    throw new Error(`'name' should be a string.`);
  }
  if (
    __DEV__ &&
    (typeof exposes !== 'object' || !Object.keys(exposes).length)
  ) {
    console.warn(`'exposes' should set at least one of the exposed module.`);
  }
  if (__DEV__ && restConfig.remoteType) {
    console.warn(
      `'remoteType' can not be set in site.config, it's be set 'script'.`
    );
  }
  if (dependencies) {
    Object.keys(dependencies).forEach((name) => {
      const { entry: defaultRemote, dependencyVersion } = (dependencies as any)[
        name
      ];
      remotes[name] =
        typeof defaultRemote === 'string'
          ? `promise (${makeRemoteScript})(${getGlobal}, ${JSON.stringify({
              name,
              identifierContainer,
              packageName,
              version: siteConfig.version,
              defaultRemote,
              dependencyVersion,
            })})`
          : defaultRemote;
      // Ensure that in any async case, `window.__RC_MFE__` is already injected from the remote entry file and resolve the mfe Promise.
    });
  }
  return {
    name: packageName,
    filename,
    remotes,
    // Resolve: ModuleFederationPlugin's name may not include dashes
    // https://github.com/webpack/webpack/issues/11923
    library: {
      type: 'window',
      name: packageName,
    },
    exposes,
    remoteType: 'script',
    ...restConfig,
  };
};

/**
 * Derive the type-archive base for an entry URL: drop the query/hash and the
 * final path segment (the remote entry file, e.g. `remoteEntry.js`) so sibling
 * assets share the base. Returns `undefined` for an unparsable entry.
 */
const deriveTypeBase = (entry: string): string | undefined => {
  try {
    const url = new URL(entry);
    const dir = url.pathname.slice(0, url.pathname.lastIndexOf('/'));
    return `${url.origin}${dir}`;
  } catch {
    if (__DEV__) {
      console.warn(
        `[MFE] Skipping remote type URL for unparsable entry: ${entry}`
      );
    }
    return undefined;
  }
};

/**
 * Derive the standard remote type-archive locations for every dependency with a
 * parseable string `entry`. Static, build-time discovery: the archive lives
 * next to `remoteEntry.js`, so we reuse each entry's base. Promise-style remotes
 * expose no inferable URL, so this explicit derivation (incl. `alias`) is the
 * authoritative discovery. Entries that don't parse are skipped.
 */
const deriveRemoteTypeUrls = (
  dependencies: SiteConfig['dependencies']
): RemoteTypeUrls => {
  const remoteTypeUrls: RemoteTypeUrls = {};
  Object.entries(dependencies ?? {}).forEach(([name, value]) => {
    const entry = typeof value === 'string' ? value : value?.entry;
    if (typeof entry !== 'string') return;
    const base = deriveTypeBase(entry);
    if (!base) return;
    remoteTypeUrls[name] = {
      alias: name,
      zip: `${base}/${MF_TYPES_ZIP}`,
      api: `${base}/${MF_TYPES_API}`,
    };
  });
  return remoteTypeUrls;
};

/**
 * Merge user-supplied `remoteTypeUrls` over the derived ones. The user wins per
 * field; `alias` defaults to the remote name so an entry that omits it (the
 * easy-to-forget field promise remotes require) still carries one.
 */
const mergeRemoteTypeUrls = (
  derived: RemoteTypeUrls,
  user: RemoteTypeUrls
): RemoteTypeUrls => {
  const merged: RemoteTypeUrls = { ...derived };
  Object.entries(user).forEach(([name, entry]) => {
    merged[name] = { alias: name, ...derived[name], ...entry };
  });
  return merged;
};

/**
 * Whether the build-time registry resolver applies. It mirrors the runtime: the
 * runtime only queries the registry when `registryAutoFetch` is on and the
 * registry type is `fetch` (jsonp is browser-only), so the resolver queries
 * only under the same conditions — fidelity over reach.
 */
const canUseRegistryResolver = (siteConfig: SiteConfig): boolean =>
  typeof siteConfig.registry === 'string' &&
  siteConfig.registry !== '*' &&
  (siteConfig.registryType ?? 'fetch') === 'fetch' &&
  siteConfig.registryAutoFetch === true &&
  typeof fetch === 'function';

/**
 * A time-bounded `AbortSignal` when the runtime provides `AbortSignal.timeout`
 * (Node >=17.3; dts requires >=20.18.1), else `undefined` (unbounded fetch).
 */
const timeoutSignal = (ms: number): AbortSignal | undefined => {
  const ctor = AbortSignal as { timeout?: (ms: number) => AbortSignal };
  return typeof ctor.timeout === 'function' ? ctor.timeout(ms) : undefined;
};

/**
 * Build an async `remoteTypeUrls` resolver (Module Federation's supported
 * function form) that, per dependency, queries the `registry` with the same
 * shape and acceptance rule the runtime uses (`getEntryFromRegistry`): the query
 * carries the consumer's version, and the resolved entry is used only when it
 * satisfies the dependency version (honoring `forcedVersion`). The type-archive
 * URL is derived from that entry. Any miss or failure falls back to the
 * static-derived URL, so type resolution never fails the build.
 */
const createRegistryResolver = (
  siteConfig: SiteConfig,
  derived: RemoteTypeUrls,
  timeout: number
): (() => Promise<RemoteTypeUrls>) => {
  const registry = siteConfig.registry as string;
  const { dependencies, name: main, version: mainVersion } = siteConfig;
  return async () => {
    const resolved = await Promise.all(
      Object.entries(dependencies ?? {}).map(async ([dependency, value]) => {
        const fallback = derived[dependency];
        try {
          const query: Record<string, string> = {
            name: main ?? '',
            dependency,
            main: main ?? '',
            mainVersion: mainVersion ?? '*',
            _: Date.now().toString(),
          };
          // The runtime query carries the consumer's version, not the remote's.
          if (mainVersion) query.version = mainVersion;
          const response = await fetch(
            `${registry}?${new URLSearchParams(query)}`,
            { signal: timeoutSignal(timeout) }
          );
          const data = (await response.json()) as RegistryResponse;
          const remoteData = data?.[dependency];
          const dependencyVersion =
            typeof value === 'object'
              ? value.dependencyVersion ?? value.version ?? '*'
              : '*';
          // Accept the registry answer only when it satisfies the dependency
          // version (as the runtime does); otherwise keep the static URL.
          if (!isSatisfied(satisfiesVersion, remoteData, dependencyVersion)) {
            return [dependency, fallback] as const;
          }
          const base = deriveTypeBase(remoteData.entry);
          if (!base) return [dependency, fallback] as const;
          return [
            dependency,
            {
              alias: dependency,
              zip: `${base}/${MF_TYPES_ZIP}`,
              api: `${base}/${MF_TYPES_API}`,
            },
          ] as const;
        } catch {
          return [dependency, fallback] as const;
        }
      })
    );
    return Object.fromEntries(
      resolved.filter(
        (pair): pair is [string, RemoteTypeUrl] => pair[1] !== undefined
      )
    );
  };
};

/**
 * Choose the consumer `remoteTypeUrls`: a user resolver/entries always win;
 * otherwise resolve via the registry when configured, else use the static
 * derivation.
 */
const resolveRemoteTypeUrls = (
  siteConfig: SiteConfig,
  derived: RemoteTypeUrls,
  userRemoteTypeUrls: DtsConsumeTypesOptions['remoteTypeUrls'],
  timeout: number
): DtsConsumeTypesOptions['remoteTypeUrls'] => {
  if (typeof userRemoteTypeUrls === 'function') return userRemoteTypeUrls;
  if (userRemoteTypeUrls && Object.keys(userRemoteTypeUrls).length > 0) {
    return mergeRemoteTypeUrls(derived, userRemoteTypeUrls);
  }
  if (canUseRegistryResolver(siteConfig)) {
    return createRegistryResolver(siteConfig, derived, timeout);
  }
  return derived;
};

/**
 * Resolve the Module Federation `dts` options for the builder from the opt-in
 * `siteConfig.dts`. Returns `undefined` when `dts` is unset so nothing
 * DTS-shaped is applied and the output stays byte-identical.
 *
 * - Producer: user `generateTypes` options (`tsConfigPath`, `outputDir`,
 *   `additionalFilesToCompile`, ...) pass through untouched. We set no default
 *   `outputDir`: dts-plugin emits `@mf-types.zip` / `@mf-types.d.ts` at the
 *   compiler output root (next to a default `remoteEntry.js`, via the default
 *   `typesFolder` of `@mf-types`), which is the location the consumer derivation
 *   targets. For a nested `filename`, set `outputDir` to keep the archive
 *   co-located with the remote entry. dts-plugin does not rewrite tsconfig
 *   path-alias imports in the emitted declarations, so a curated public entry
 *   must use only relative or package-resolvable imports.
 * - Consumer: resolve `consumeTypes.remoteTypeUrls` (static derivation, or the
 *   registry resolver when a `registry` is configured); a user-supplied value
 *   wins. Default `consumeTypes.typesOnBuild` to `true` when consuming is on so
 *   production builds actually fetch the types.
 */
export const getDtsPluginOptions = (
  siteConfig: SiteConfig
): PluginDtsOptions | undefined => {
  const { dts, dependencies } = siteConfig;
  if (!dts) return undefined;

  const resolved: PluginDtsOptions = { ...dts };

  // Skip consumer wiring entirely when the user explicitly opted out.
  if (resolved.consumeTypes !== false) {
    const userConsume: DtsConsumeTypesOptions =
      typeof resolved.consumeTypes === 'object' ? resolved.consumeTypes : {};
    const derived = deriveRemoteTypeUrls(dependencies);
    const timeout = userConsume.timeout ?? DEFAULT_REGISTRY_TIMEOUT;
    // Turn consuming on only when the user opted in or a remote was discovered.
    if (
      resolved.consumeTypes !== undefined ||
      Object.keys(derived).length > 0
    ) {
      resolved.consumeTypes = {
        // Production consumption needs the build-time fetch; MF skips it otherwise.
        typesOnBuild: true,
        ...userConsume,
        remoteTypeUrls: resolveRemoteTypeUrls(
          siteConfig,
          derived,
          userConsume.remoteTypeUrls,
          timeout
        ),
      };
    }
  }

  return resolved;
};
