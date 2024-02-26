import { global } from '@ringcentral/mfe-shared';
import { identifierContainer } from '../constants';
import { isSPAMode } from '../meta';

export const onUnmount = ({
  target,
  name,
  id,
}: {
  target: HTMLElement;
  name: string;
  id: string;
}) => {
  if (isSPAMode() || !global[identifierContainer].renderContainers) return;
  delete global[identifierContainer].renderContainers[id];
};
