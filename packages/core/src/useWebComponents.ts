/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable guard-for-in */
import { global } from '@ringcentral/mfe-shared';
import {
  customElementName,
  identifierAttribute,
  identifierContainer,
  RenderType,
} from './constants';
import {
  UseWebComponents,
  DefineCustomElementOptions,
  ExposeOptions,
} from './interface';
import { loadApp } from './loadApp';
import { onUnmount, onMounted, onWillMount } from './lifecycle';
import { uuid } from './utils';
import { isSPAMode } from './meta';

const mfeHTMLElement = `class RC_MFE extends HTMLElement {
  constructor() {
    super();
    if (!window.__RC_MFE_CUSTOM_ELEMENTS_INSTANCES__.has(this)) {
      window.__RC_MFE_CUSTOM_ELEMENTS_INSTANCES__.set(this);
    }
  }

  disconnectedCallback() {
    const fn = window.__RC_MFE_CUSTOM_ELEMENTS_INSTANCES__.get(this);
    if (fn) fn();
    window.__RC_MFE_CUSTOM_ELEMENTS_INSTANCES__.delete(this);
  }
}`;

// https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs#custom-elements-es5-adapterjs
global.__RC_MFE_CUSTOM_ELEMENTS_INSTANCES__ = new Map();

export const defineCustomElement = (
  options: DefineCustomElementOptions & {
    customElement: HTMLElement;
  }
) => {
  if (!customElements.get(customElementName)) {
    customElements.define(
      customElementName,
      Function(`return ${mfeHTMLElement}`)()
    );
  }
  const renderNode = document.createElement('div');
  const customElementInstance = options.customElement;
  let injectedRoot: HTMLElement | ShadowRoot;
  if (options.useShadowDOM && isSPAMode()) {
    if (__DEV__) {
      console.error(
        '[MFE] Shadow DOM is not supported in SPA mode, fallback to use light DOM'
      );
    }
    options.useShadowDOM = false;
  }
  if (
    options.useShadowDOM &&
    !isSPAMode() &&
    !global[identifierContainer].enableCssIsolation
  ) {
    if (__DEV__) {
      console.error(
        `[MFE] Shadow DOM is not supported in MFE mode, fallback to use light DOM, and please use 'insertStyle' in '@ringcentral/mfe-builder' for webpack.`
      );
    }
    options.useShadowDOM = false;
  }
  if (options.useShadowDOM) {
    const shadow = customElementInstance.attachShadow({
      mode: options.shadowMode!,
    });
    shadow.appendChild(renderNode);
    injectedRoot = shadow;
  } else {
    customElementInstance.appendChild(renderNode);
    injectedRoot = customElementInstance;
  }
  return { renderNode, injectedRoot: injectedRoot as HTMLElement };
};

/**
 * Mount an app with WebComponents to a target element.
 */
export const useWebComponents: UseWebComponents = ({
  name,
  loader,
  target,
  shadowMode = 'open',
  useShadowDOM,
  attrs,
  props,
  bootstrap,
}) => {
  return loadApp(loader, name).then((module?: { default: ExposeOptions }) => {
    if (typeof module?.default === 'undefined') {
      throw new Error(`'[MFE] ${name}' app should export default exposed API.`);
    }
    const customElement = document.createElement(customElementName);
    const id = uuid(name);
    customElement.setAttribute(identifierAttribute, id);
    target.appendChild(customElement);
    const { renderNode, injectedRoot } = defineCustomElement({
      name,
      shadowMode,
      useShadowDOM,
      customElement,
    });
    const attributes: Record<string, any> = attrs ?? {};
    for (const key in attributes) {
      renderNode.setAttribute(key, attributes[key]);
    }
    const { render, init } = module.default;
    const result = bootstrap ? bootstrap(module.default as any) : init?.();
    const _render = () => {
      onWillMount({ target: injectedRoot, name, id });
      const callback = render(renderNode, props ?? {}, id);
      onMounted({
        target: injectedRoot,
        name,
        id,
        type: RenderType.WebComponents,
      });
      global.__RC_MFE_CUSTOM_ELEMENTS_INSTANCES__.set(customElement, () => {
        onUnmount({ target: injectedRoot, name, id });
        callback?.();
      });
    };
    if (result instanceof Promise) {
      return result.then(_render);
    }
    return _render();
  });
};
