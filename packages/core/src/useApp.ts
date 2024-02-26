/* eslint-disable guard-for-in */
import { uuid } from './utils';
import { ExposeOptions, UseApp } from './interface';
import { loadApp } from './loadApp';
import { onUnmount, onMounted, onWillMount } from './lifecycle';
import { identifierAttribute, RenderType } from './constants';

/**
 * Mount an app to a target element.
 */
export const useApp: UseApp = ({
  name,
  loader,
  props,
  target,
  attrs,
  bootstrap,
}) => {
  return loadApp(loader, name).then((module?: { default: ExposeOptions }) => {
    if (typeof module?.default === 'undefined') {
      throw new Error(`[MFE] '${name}' app should export default exposed API.`);
    }
    const rootNode = document.createElement('div');
    const id = uuid(name);
    rootNode.setAttribute(identifierAttribute, id);
    const attributes: Record<string, any> = attrs ?? {};
    for (const key in attributes) {
      rootNode.setAttribute(key, attributes[key]);
    }
    target.appendChild(rootNode);
    const renderNode = document.createElement('div');
    rootNode.appendChild(renderNode);
    const { render, init } = module.default;
    const result = bootstrap ? bootstrap(module.default as any) : init?.();
    const _render = () => {
      onWillMount({ target: rootNode, name, id });
      const callback = render(renderNode, props ?? {}, id);
      onMounted({ target: rootNode, name, id, type: RenderType.App });
      return () => {
        onUnmount({ target: rootNode, name, id });
        callback?.();
      };
    };
    if (result instanceof Promise) {
      return result.then(_render);
    }
    return _render();
  });
};
