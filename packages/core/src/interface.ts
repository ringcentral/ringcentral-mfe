/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Dependency } from '@ringcentral/mfe-shared';
import type { GlobalTransport } from '@ringcentral/mfe-transport';

export type NodeElement = HTMLElement | null | undefined;

export type Unmount = void | (() => void);

export type Render = (
  /**
   * The root element of the app.
   */
  target?: NodeElement,
  /**
   * The props of the app.
   */
  props?: any,
  /**
   * render mfe Id
   */
  id?: string
) => Unmount;

export interface ExposeOptions {
  /**
   * init app
   */
  init?: (...args: any) => any;
  /**
   * render app
   */
  render: Render;
  /**
   * transports for app
   */
  transport?: GlobalTransport;
}

export type RenderProps<T extends ExposeOptions> = Parameters<T['render']>[1];

type Bootstrap<T extends ExposeOptions> = (options: T) => void | Promise<void>;

export type Loader<T extends ExposeOptions> = (name: string) => Promise<{
  default: T;
}>;

export interface UseAppOptions<T extends ExposeOptions> {
  /**
   * app name
   */
  name: string;
  /**
   * app render dom target
   */
  target: HTMLElement;
  /**
   * app loader
   */
  loader: Loader<T>;
  /**
   * app render dom attrs
   */
  attrs?: Record<string, unknown>;
  /**
   * app render props
   */
  props?: RenderProps<T>;
  /**
   * bootstrap app
   */
  bootstrap?: Bootstrap<T>;
}

export type UseApp = <T extends ExposeOptions>(
  options: UseAppOptions<T>
) => Promise<void | (() => void)>;

export interface UseIframeOptions<T = {}> {
  /**
   * app name
   */
  name: string;
  /**
   * app render dom target
   */
  target: HTMLElement;
  /**
   * iframe url
   */
  url?: string;
  /**
   * app render dom attrs
   */
  attrs?: T;
  /**
   * scope of transport
   */
  scope?: string;
}

export type UseIframe = <T>(options: UseIframeOptions<T>) => void;

export interface UseWebComponentsOptions<T extends ExposeOptions> {
  /**
   * app name
   */
  name: string;
  /**
   * app render dom target
   */
  target: HTMLElement;
  /**
   * use web components with ShadowDOM
   */
  useShadowDOM?: boolean;
  /**
   * ShadowDOM mode
   */
  shadowMode?: 'open' | 'closed';
  /**
   * app loader
   */
  loader: Loader<T>;
  /**
   *  app render dom attrs
   */
  attrs?: Record<string, unknown>;
  /**
   * app render props
   */
  props?: RenderProps<T>;
  /**
   * bootstrap app
   */
  bootstrap?: Bootstrap<T>;
}

export type UseWebComponents = <T extends ExposeOptions>(
  options: UseWebComponentsOptions<T>
) => Promise<void>;

export type DefineCustomElementOptions = Pick<
  UseWebComponentsOptions<any>,
  Exclude<keyof UseWebComponentsOptions<any>, 'target' | 'loader'>
>;

// TODO: fix type from webpack module federation
export interface MFEConfig {
  name: string;
  dependencies: {
    [key: string]: Required<Dependency>;
  };
  version?: string;
  registry?: string;
}
export interface Meta {
  /**
   * the current app name
   */
  name?: string;
  /**
   * meta data
   */
  data: {
    /**
     * app shell name
     */
    main: string;
    /**
     * app sell url
     */
    entry: string;
    /**
     * app shell registry server
     */
    registry: string;
    /**
     * app shell version
     */
    version: string;
    /**
     * modules config
     */
    modules: Record<string, MFEConfig>;
    /**
     * app render containers
     */
    renderContainers: Record<
      string,
      {
        /**
         * app name
         */
        name: string;
        /**
         * render container type
         */
        type: string;
        /**
         * render timestamp
         */
        timestamp: number;
      }
    >;
  };
  /**
   * loaded apps
   */
  loaded: string[];
  /**
   * rendered apps
   */
  rendered: string[];
}
