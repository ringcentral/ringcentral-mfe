import type { container } from 'webpack';

type Rule = string | RegExp;

export interface IStorage {
  clear(): void | Promise<void>;
  getItem(key: string): string | null | Promise<string | null>;
  removeItem(key: string): void | Promise<void>;
  setItem(key: string, value: string): void | Promise<void>;
}
export interface Dependency {
  /**
   * The remote entry url
   */
  entry: string;
  /**
   * The remote entry version
   */
  version?: string;
  /**
   * The remote entry dependency version rule
   */
  dependencyVersion?: string;
  /**
   * The remote entry meta data
   */
  meta?: Record<string, any>;
}

export type RegistryData = Dependency & {
  /**
   * force the version to be updated, default is false
   */
  forcedVersion?: boolean;
};

export type RegistryResponse = Record<string, RegistryData>;

export type ModuleFederationPluginOptions = ConstructorParameters<
  typeof container.ModuleFederationPlugin
>[0];

export type RegistryType = 'fetch' | 'jsonp';

export interface EntryResult {
  /**
   * The remote entry url from storage
   */
  entry: string;
  /**
   * The remote fetch Promise
   */
  fetchPromise?: Promise<RegistryData | undefined>;
}

export interface SiteOverridableConfig {
  /**
   * The site prefix, support dynamic mode
   */
  prefix?: string | Record<string, string>;
  /**
   * The site version
   */
  version?: string;
  /**
   * The site default mode
   */
  defaultMode?: string;
  /**
   * The registry server, support dynamic mode
   */
  registry?: string | Record<string, string>;
  /**
   * The registry type, 'jsonp' or 'fetch', default is 'fetch'
   */
  registryType?: RegistryType;
  /**
   * Whether to automatically fetch registry, default is false
   */
  registryAutoFetch?: boolean;
  /**
   * optional value to set the maximum number of retries to load the module remote script.
   * The default is 1.
   */
  maxRetries?: number;
  /**
   * Optional number value to set the delay time in milliseconds to try to load the module remote script again.
   * The default value is 1000.
   */
  retryDelay?: number;
  /**
   * Customize the projectRoot, which is used to resolve the absolute path of the site.config.
   * The default value is the current working directory (process.cwd())
   */
  projectRoot?: string;
}

/**
 * A single remote's published type-archive locations, as consumed by
 * `@module-federation/dts-plugin`.
 */
export interface RemoteTypeUrl {
  /**
   * The remote's federation alias. The builder always sets this to the remote
   * name; promise-style remotes require it to consume types.
   */
  alias?: string;
  /**
   * URL of the flat `@mf-types.d.ts` API declaration.
   */
  api: string;
  /**
   * URL of the `@mf-types.zip` type archive.
   */
  zip: string;
}

export type RemoteTypeUrls = Record<string, RemoteTypeUrl>;

/**
 * Producer-side type generation options, mirroring
 * `@module-federation/dts-plugin`'s `DtsRemoteOptions`.
 */
export interface DtsGenerateTypesOptions {
  tsConfigPath?: string;
  typesFolder?: string;
  compiledTypesFolder?: string;
  deleteTypesFolder?: boolean;
  additionalFilesToCompile?: string[];
  /**
   * Directory the type archive is emitted to (relative to the compiler
   * context). Defaults to the compiler output root, i.e. next to
   * `remoteEntry.js` — set it to match a nested `filename` directory so the
   * archive stays co-located with the remote entry.
   */
  outputDir?: string;
  compileInChildProcess?: boolean;
  compilerInstance?: 'tsc' | 'vue-tsc' | 'tspc' | string;
  generateAPITypes?: boolean;
  extractThirdParty?: boolean | { exclude?: Array<string | RegExp> };
  extractRemoteTypes?: boolean;
  abortOnError?: boolean;
  deleteTsConfig?: boolean;
}

/**
 * Consumer-side type options, mirroring
 * `@module-federation/dts-plugin`'s `DtsHostOptions`.
 */
export interface DtsConsumeTypesOptions {
  typesFolder?: string;
  abortOnError?: boolean;
  remoteTypesFolder?: string;
  deleteTypesFolder?: boolean;
  maxRetries?: number;
  consumeAPITypes?: boolean;
  runtimePkgs?: string[];
  /**
   * Static per-remote type-archive locations. The builder derives these from
   * the declared `dependencies`; user-supplied entries win.
   */
  remoteTypeUrls?: RemoteTypeUrls | (() => Promise<RemoteTypeUrls>);
  timeout?: number;
  /**
   * IP family used for network requests.
   */
  family?: 4 | 6;
  /**
   * Fetch and unpack remote types during the build. Required for the builder's
   * production consumption (MF skips the fetch otherwise).
   */
  typesOnBuild?: boolean;
}

/**
 * Opt-in Module Federation type options, mirroring
 * `@module-federation/dts-plugin`'s `PluginDtsOptions`. Declared here so the
 * builder does not take a hard dependency on the optional peer package.
 */
export interface PluginDtsOptions {
  generateTypes?: boolean | DtsGenerateTypesOptions;
  consumeTypes?: boolean | DtsConsumeTypesOptions;
  tsConfigPath?: string;
  extraOptions?: Record<string, unknown>;
  implementation?: string;
  cwd?: string;
  displayErrorInTerminal?: boolean;
}

export interface SiteConfig
  extends Pick<
      ModuleFederationPluginOptions,
      Exclude<keyof ModuleFederationPluginOptions, 'remotes'>
    >,
    SiteOverridableConfig {
  /**
   * The filename of the container as relative path inside the `output.path` directory.
   */
  filename?: string;
  /**
   * The site micro front-end dependencies
   */
  dependencies?: {
    [key: string]: string | Dependency;
  };

  /**
   * The optimization options for site federation plugin
   */
  optimization?: {
    /**
     * Add MFE meta for all modules matching any of these conditions.
     */
    injectMeta?: Rule[];
  };

  /**
   * Opt-in federated types. When set, the builder wires
   * `@module-federation/dts-plugin` (an optional peer dependency) to emit the
   * standard `@mf-types.zip` / `@mf-types.d.ts` for producers and to consume
   * remote types for consumers. Unset means byte-identical output and no extra
   * dependency. See `PluginDtsOptions`.
   */
  dts?: PluginDtsOptions;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ModuleFederationConfig extends ModuleFederationPluginOptions {}

export interface Options {
  overrides?: Partial<SiteOverridableConfig>;
}

export type SiteConfigFile =
  | SiteConfig
  | ((env: Record<string, any>) => SiteConfig);

export interface InsertedStyle {
  elements?: (HTMLStyleElement | HTMLLinkElement)[];
  targets?: HTMLElement[];
}
