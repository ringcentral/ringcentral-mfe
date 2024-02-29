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

export type RegistryType = 'fetch' | 'jsonp' | 'server';

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
  dependenciesLock?: Record<
    string,
    {
      version: string;
      remoteEntry: string;
      links?: Record<string, string>;
      meta?: Record<string, any>;
    }
  >;
  links?: Record<string, string>;
  meta?: Record<string, any>;
  remoteEntry?: string;
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
