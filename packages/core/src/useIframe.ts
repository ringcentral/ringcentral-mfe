/* eslint-disable no-console */
/* eslint-disable guard-for-in */
import { createScopeName } from '@ringcentral/mfe-transport';
import { uuid, parserRemoteUrl, getConfig } from './utils';
import { UseIframe } from './interface';
import { identifierAttribute, RenderType } from './constants';
import { getEntry } from './getEntry';
import { onUnmount, onMounted } from './lifecycle';

export const getIframeUrl = async (siteName: string) => {
  const { dependencies, name, registry } = getConfig(siteName);
  if (typeof dependencies[siteName] === 'undefined') {
    throw new Error(
      `[MFE] The site named "${siteName}" is not in the dependency list of "${name}" app.`
    );
  }
  let rawUrl = dependencies[siteName].entry;

  if (registry) {
    rawUrl = (await getEntry(siteName)).entry;
  }
  // TODO: support more flexible url config and custom iframe url in mfe dependencies config
  return parserRemoteUrl(rawUrl).path;
};

/**
 * Mount an app with iframe to a target element.
 */
export const useIframe: UseIframe = async ({
  target,
  name,
  url,
  attrs,
  scope,
}) => {
  const iframe = document.createElement('iframe');
  iframe.src = url ?? (await getIframeUrl(name));
  const id = uuid(name);
  iframe.setAttribute('frameBorder', 'no');
  const attributes: Record<string, never> = attrs ?? {};
  for (const key in attributes) {
    iframe.setAttribute(key, attributes[key]);
  }
  iframe.setAttribute(identifierAttribute, id);
  iframe.setAttribute('name', createScopeName(id, scope));
  target.appendChild(iframe);
  onMounted({ target, name, id, type: RenderType.Iframe });
  return () => {
    onUnmount({ target, name, id });
  };
};
