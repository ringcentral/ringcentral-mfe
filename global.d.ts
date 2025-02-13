/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable camelcase */
export {};

declare global {
  const __DEV__: boolean;

  const __webpack_init_sharing__: (options: 'default') => Promise<void>;
  const __webpack_share_scopes__: { default: Record<string, unknown> };

  var __RC_MFE_REGISTRY_CALLBACK__: any;

  var __RC_MFE_SATISFY__: any;
  var __RC_MFE_USE_LOADER__: boolean;
  var ROARR: {
    write: (message: string) => void;
  };
  var __RC_MFE__: {
    entry: string;
    main: string;
    prefix?: string;
    registry: string;
    registryType: 'fetch' | 'jsonp';
    registryAutoFetch: boolean;
    version: string;
    defaultMode: string;
    modules: Record<string, any>;
    toBeResolved: (() => void)[];
    renderContainers: Record<string, any>;
    styles: Record<string, any>;
    enableCssIsolation?: boolean;
    loads: Record<string, Promise<any>>;
    dynamicImport: (...args: any) => any;
    storage: {
      clear(): void | Promise<void>;
      getItem(key: string): string | null | Promise<string | null>;
      removeItem(key: string): void | Promise<void>;
      setItem(key: string, value: string): void | Promise<void>;
    };
    _onUpdateStorage: Set<(name: string, newValue: any, oldValue: any) => void>;
    _updateStorage: Set<any>;
    _toBeResolvedUpdateStorage: Set<() => void> | null;
    sentryInstances: any[];
  };

  var __RC_MFE_REGISTRY_CALLBACK__: Record<string, (data: any) => void>;
  var __RC_MFE_REGISTRY_PROMISES__: Record<string, Promise<any>>;

  var __RC_MFE_CUSTOM_ELEMENTS_INSTANCES__: Map<
    HTMLElement,
    undefined | (() => void)
  >;
  var __RC_TRANSPORT__: any;

  var mockImport: any;

  interface Window {
    _lastElementInsertedByStyleLoader: HTMLStyleElement;
    name: string;
  }

  namespace JSX {
    interface IntrinsicElements {
      'rc-mfe': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}
