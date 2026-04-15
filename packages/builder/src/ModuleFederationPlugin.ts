/* eslint-disable global-require */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable prefer-destructuring */
import type { Compiler } from 'webpack';
import {
  getEntryFromRegistry,
  fetchWithJsonp,
  getGlobal,
  injectScript,
  ModuleFederationPluginOptions,
  SiteOverridableConfig,
  identifier,
  identifierContainer,
  SiteConfig,
  isSatisfied,
  satisfiesVersion,
} from '@ringcentral/mfe-shared';
import { getModuleFederationConfig, getSiteConfig } from './getConfig';
import { getEnv } from './getEnv';
import { makeBannerScript } from './make';

// Support both webpack and Rspack. Set the BUNDLER=rspack environment variable
// when invoking webpack CLI / rspack CLI to switch to @rspack/core at runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BannerPlugin, container, DefinePlugin } = (
  process.env.BUNDLER === 'rspack'
    ? require('@rspack/core')
    : require('webpack')
) as typeof import('webpack');

// use `--env spa` for webpack cli
const SPA_CLI = 'spa';

export const getBannerScript = ({
  identifierContainer,
  mfeConfig,
  identifier,
  maxRetries,
  retryDelay,
}: {
  identifierContainer: string;
  mfeConfig: Pick<
    SiteConfig,
    Exclude<keyof SiteConfig, 'optimization' | 'shared'>
  >;
  identifier: string;
  maxRetries: number;
  retryDelay: number;
}) =>
  `;(${makeBannerScript})(${getGlobal}, ${injectScript}, ${getEntryFromRegistry}, ${fetchWithJsonp}, ${satisfiesVersion}, ${isSatisfied},${JSON.stringify(
    {
      identifierContainer,
      mfeConfig,
      identifier,
      maxRetries,
      retryDelay,
    }
  )});`;

/**
 * Module federation plugin for RC-MFE.
 *
 * Compatible with both **webpack** (default) and **Rspack**.
 * Set the `BUNDLER=rspack` environment variable to use `@rspack/core` instead of webpack.
 *
 * @example webpack (default)
 * ```js
 * // webpack.config.js
 * const { ModuleFederationPlugin } = require('@ringcentral/mfe-builder');
 * module.exports = { plugins: [new ModuleFederationPlugin()] };
 * ```
 *
 * @example rspack
 * ```js
 * // rspack.config.js  (run with BUNDLER=rspack)
 * const { ModuleFederationPlugin } = require('@ringcentral/mfe-builder');
 * module.exports = { plugins: [new ModuleFederationPlugin()] };
 * ```
 */
class ModuleFederationPlugin extends container.ModuleFederationPlugin {
  bannerPlugin: InstanceType<typeof BannerPlugin>;

  definePlugin: InstanceType<typeof DefinePlugin>;

  constructor(
    siteExtraConfig?: SiteOverridableConfig,
    externalOptions?: ModuleFederationPluginOptions
  ) {
    const siteConfig = getSiteConfig({
      overrides: siteExtraConfig,
    });
    const moduleFederationConfig = getModuleFederationConfig(siteConfig);
    const options = {
      ...moduleFederationConfig,
      ...externalOptions,
    };
    super(options);
    const { shared, optimization, ...mfeConfig } = siteConfig;
    const maxRetries = siteConfig.maxRetries ?? 1;
    const retryDelay = siteConfig.retryDelay ?? 1000;
    const injectMeta = optimization?.injectMeta;
    if (injectMeta && !Array.isArray(injectMeta)) {
      throw new Error(
        `[MFE] Invalid injectMeta config: ${injectMeta}, it should be an array.`
      );
    }
    const injectMetaConfig = {
      include: [...(injectMeta ?? []), options.filename!],
    };
    this.bannerPlugin = new BannerPlugin({
      ...injectMetaConfig,
      banner: getBannerScript({
        identifierContainer,
        mfeConfig,
        identifier,
        maxRetries,
        retryDelay,
      }),
      raw: true,
    });
    this.definePlugin = new DefinePlugin({
      'process.env.MFE': JSON.stringify(`${mfeConfig.name}`),
    });
  }

  apply(compiler: Compiler) {
    const isSPAbuild = getEnv()[SPA_CLI];
    this.bannerPlugin.apply.call(this.bannerPlugin, compiler);
    this.definePlugin.apply.call(this.definePlugin, compiler);
    if (isSPAbuild) return;
    super.apply.call(this, compiler);
  }
}

export { ModuleFederationPlugin };
