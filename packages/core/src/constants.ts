/* eslint-disable prefer-destructuring */
/* eslint-disable no-shadow */
export {
  identifier,
  customElementName,
  identifierContainer,
  identifierAttribute,
} from '@ringcentral/mfe-shared';

export const enum RenderType {
  Manual = 'manual',
  App = 'core-useApp',
  Iframe = 'core-useIframe',
  WebComponents = 'core-useWebComponents',
}
