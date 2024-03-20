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
} from '@ringcentral/mfe-shared';
import { getGlobal, identifierContainer } from '@ringcentral/mfe-shared';
import { getEnv } from './getEnv';
import { makeRemoteScript } from './make';

const DEFAULT_REMOTE_ENTRY = 'remoteEntry.js';

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
    throw new Error(`'exposes' should set at least one of the exposed module.`);
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
