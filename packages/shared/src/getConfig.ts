/* eslint-disable no-param-reassign */
/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-dynamic-require */
import type { SiteConfig, Options, SiteConfigFile } from './interface';
import { getEnv } from './getEnv';

export const getSiteConfig = (
  configFile: string,
  env: string[],
  { overrides = {} }: Options = {}
): SiteConfig => {
  try {
    const rawConfig: SiteConfigFile = require(configFile);
    const config =
      typeof rawConfig === 'object' ? rawConfig : rawConfig(getEnv(env));
    const {
      $schema,
      dependencies = {},
      dependenciesLock = {},
      ...siteConfig
    }: SiteConfig & {
      $schema?: string;
    } = {
      ...config,
      ...overrides,
    };
    Object.entries(dependencies).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const isVersion = !/^http/.test(value);
        const entry = isVersion ? dependenciesLock[key].remoteEntry : value;
        dependencies[key] = {
          entry,
          version: isVersion ? dependenciesLock[key].version : '*',
          dependencyVersion: isVersion ? value : '*',
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
      dependenciesLock,
    };
  } catch (e) {
    console.error(`[MFE] make sure to set site config  in ${configFile}`);
    throw e;
  }
};
