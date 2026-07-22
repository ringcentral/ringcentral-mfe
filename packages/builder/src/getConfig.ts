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
} from '@ringcentral/mfe-shared';
import { getGlobal, identifierContainer } from '@ringcentral/mfe-shared';
import { getEnv } from './getEnv';
import { makeRemoteScript } from './make';

const DEFAULT_REMOTE_ENTRY = 'remoteEntry.js';

// Conventional Module Federation type-archive filenames emitted next to the
// remote entry by `@module-federation/dts-plugin`.
const MF_TYPES_ZIP = '@mf-types.zip';
const MF_TYPES_API = '@mf-types.d.ts';

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
 * Strip the final path segment (the remote entry file, e.g. `remoteEntry.js`)
 * from an entry URL so sibling assets can be addressed at the same base.
 */
const stripEntryFilename = (entry: string): string => {
  const lastSlash = entry.lastIndexOf('/');
  return lastSlash === -1 ? entry : entry.slice(0, lastSlash);
};

/**
 * Derive the standard remote type-archive locations for every dependency that
 * declares a string `entry` URL. Discovery is fully static and build-time: the
 * archive lives next to `remoteEntry.js`, so we reuse each dependency's entry
 * base. Promise-style remotes have no inferable URL, so this explicit
 * derivation (including the required `alias`) is the authoritative discovery.
 */
const deriveRemoteTypeUrls = (
  dependencies: SiteConfig['dependencies']
): Record<string, RemoteTypeUrl> => {
  const remoteTypeUrls: Record<string, RemoteTypeUrl> = {};
  Object.entries(dependencies ?? {}).forEach(([name, value]) => {
    const entry = typeof value === 'string' ? value : value?.entry;
    if (typeof entry !== 'string') return;
    const base = stripEntryFilename(entry);
    remoteTypeUrls[name] = {
      alias: name,
      zip: `${base}/${MF_TYPES_ZIP}`,
      api: `${base}/${MF_TYPES_API}`,
    };
  });
  return remoteTypeUrls;
};

/**
 * Resolve the Module Federation `dts` options for the builder from the opt-in
 * `siteConfig.dts`. Returns `undefined` when `dts` is unset so that nothing
 * DTS-shaped is applied and the output stays byte-identical.
 *
 * - Producer: user `generateTypes` options (`tsConfigPath`, `outputDir`,
 *   `additionalFilesToCompile`, ...) pass through untouched. We set no default
 *   `outputDir`: dts-plugin emits `@mf-types.zip` / `@mf-types.d.ts` at the
 *   compiler output root (next to a default `remoteEntry.js`, via the default
 *   `typesFolder` of `@mf-types`), which is exactly the location the consumer
 *   derivation below targets. For a nested `filename`, set `outputDir` to keep
 *   the archive co-located with the remote entry. Note: dts-plugin does not
 *   rewrite tsconfig path-alias imports in the emitted declarations, so a
 *   curated public entry must use only relative or package-resolvable imports.
 * - Consumer: derive `consumeTypes.remoteTypeUrls` from `dependencies`; a
 *   user-supplied entry always wins (a user-supplied function resolver is left
 *   untouched). Default `consumeTypes.typesOnBuild` to `true` when consuming is
 *   on so production builds actually fetch the types.
 *
 * Note: dev-time hot type reload is unsupported in v1; the plugin forces the
 * top-level `dev` option off when handing these options to dts-plugin.
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
    const userRemoteTypeUrls = userConsume.remoteTypeUrls;
    // A user function resolver takes full control; skip static derivation.
    const derived =
      typeof userRemoteTypeUrls === 'function'
        ? undefined
        : deriveRemoteTypeUrls(dependencies);
    const hasDiscovery = !!derived && Object.keys(derived).length > 0;
    // Turn consuming on only when the user opted in or a remote was discovered.
    if (resolved.consumeTypes !== undefined || hasDiscovery) {
      resolved.consumeTypes = {
        // Production consumption needs the build-time fetch; MF skips it otherwise.
        typesOnBuild: true,
        ...userConsume,
        remoteTypeUrls:
          typeof userRemoteTypeUrls === 'function'
            ? userRemoteTypeUrls
            : {
                ...derived,
                // A user-supplied entry always wins over the derived one.
                ...userRemoteTypeUrls,
              },
      };
    }
  }

  return resolved;
};
