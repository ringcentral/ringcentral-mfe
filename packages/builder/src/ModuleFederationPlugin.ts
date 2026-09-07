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
  PluginDtsOptions,
  isSatisfied,
  satisfiesVersion,
} from '@ringcentral/mfe-shared';
import {
  getDtsPluginOptions,
  getModuleFederationConfig,
  getSiteConfig,
} from './getConfig';
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
    Exclude<keyof SiteConfig, 'optimization' | 'shared' | 'dts'>
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

  // Native federation options handed to `super()`, reused when applying the
  // optional DtsPlugin. Never contains `dts`/`dev`.
  private federationOptions: ModuleFederationPluginOptions;

  // Resolved Module Federation type options; `undefined` when `dts` is unset,
  // in which case nothing DTS-shaped is applied and output is byte-identical.
  private dtsOptions?: PluginDtsOptions;

  constructor(
    siteExtraConfig?: SiteOverridableConfig,
    externalOptions?: ModuleFederationPluginOptions
  ) {
    const siteConfig = getSiteConfig({
      overrides: siteExtraConfig,
    });
    // Strip non-native keys before building super() options: the native
    // container rejects unknown keys and the banner must not serialize them.
    // site.config is arbitrary JS, so drop enhanced-only keys at runtime too.
    const { dts, dev, runtimePlugins, ...builderConfig } =
      siteConfig as SiteConfig & { dev?: unknown; runtimePlugins?: unknown };
    if (__DEV__ && (dev !== undefined || runtimePlugins !== undefined)) {
      console.warn(
        `[MFE] 'dev'/'runtimePlugins' are not supported by this builder and are ignored.`
      );
    }
    const moduleFederationConfig = getModuleFederationConfig(builderConfig);
    const options = {
      ...moduleFederationConfig,
      ...externalOptions,
    };
    super(options);
    this.federationOptions = options;
    // Resolve from the full siteConfig (needs `dependencies`); applied lazily
    // in apply() only when `dts` was set.
    this.dtsOptions = getDtsPluginOptions(siteConfig);
    const { shared, optimization, ...mfeConfig } = builderConfig;
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
    // Federated types live in the non-SPA path, after native federation.
    if (this.dtsOptions) this.applyDtsPlugin(compiler);
  }

  /**
   * Apply `@module-federation/dts-plugin` when `dts` is enabled.
   *
   * It ships as an optional dependency and is required lazily (never at module
   * top-level): it pulls a heavy dependency subtree and needs Node >=20.18.1, so
   * an eager import would crash the builder wherever the platform skipped it. The
   * same package covers webpack and Rspack, so no `BUNDLER` switch is needed.
   * `DtsPlugin` reads its config from `options.dts`; `addRuntimePlugins()` is not
   * called (no enhanced runtime).
   */
  private applyDtsPlugin(compiler: Compiler) {
    let dtsPlugin: typeof import('@module-federation/dts-plugin');
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      dtsPlugin =
        require('@module-federation/dts-plugin') as typeof import('@module-federation/dts-plugin');
    } catch (error) {
      const err = error as NodeJS.ErrnoException | undefined;
      // Only the optional dependency itself being absent is the opt-in error.
      // Match the specifier form (not a bare substring): Node's MODULE_NOT_FOUND
      // message also lists the failing module's path under "Require stack:", so a
      // broken transitive dependency would otherwise be misreported as absent.
      if (
        err?.code === 'MODULE_NOT_FOUND' &&
        err.message.includes(
          "Cannot find module '@module-federation/dts-plugin'"
        )
      ) {
        throw new Error(
          `[MFE] federated types require '@module-federation/dts-plugin', which ships as an optional dependency but could not be loaded (it requires Node >=20.18.1). Upgrade Node or install it manually to use \`dts\`.`
        );
      }
      throw error;
    }
    new dtsPlugin.DtsPlugin({
      ...this.federationOptions,
      // No dev-time type server; force `dev` off.
      dev: false,
      dts: this.dtsOptions,
    }).apply(compiler);
  }
}

export { ModuleFederationPlugin };
