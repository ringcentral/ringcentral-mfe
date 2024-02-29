/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable prefer-destructuring */
import { BannerPlugin, container, Compiler, DefinePlugin } from 'webpack';
import path from 'path';
import yargs from 'yargs';
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
  getSiteConfig,
  getEnv,
} from '@ringcentral/mfe-shared';
import { getModuleFederationConfig } from './getConfig';
import { makeBannerScript } from './make';

const { env } = yargs.array('env').default('env', []).argv as { env: string[] };

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
 * Webpack plugin for module federation In RC-MFE
 */
class ModuleFederationPlugin extends container.ModuleFederationPlugin {
  bannerPlugin: BannerPlugin;

  definePlugin: DefinePlugin;

  constructor(
    siteExtraConfig?: SiteOverridableConfig,
    externalOptions?: ModuleFederationPluginOptions
  ) {
    const rootPath = process.cwd();
    const configFile = path.join(rootPath, 'site.config');
    const siteConfig = getSiteConfig(configFile, env, {
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
    const isSPAbuild = getEnv(env)[SPA_CLI];
    this.bannerPlugin.apply.call(this.bannerPlugin, compiler);
    this.definePlugin.apply.call(this.definePlugin, compiler);
    if (isSPAbuild) return;
    super.apply.call(this, compiler);
  }
}

export { ModuleFederationPlugin };
