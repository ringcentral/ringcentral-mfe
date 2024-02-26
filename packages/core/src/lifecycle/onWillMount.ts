import { global, identifierContainer } from '@ringcentral/mfe-shared';
import { insertStyle } from '../insertStyle';
import { isSPAMode } from '../meta';

export const onWillMount = ({
  target,
  name,
  id,
}: {
  target: HTMLElement;
  name: string;
  id: string;
}) => {
  if (isSPAMode() || !global[identifierContainer].styles) return;
  insertStyle(target, name);
};
