/* eslint-disable no-console */
import type { InsertedStyle } from '@ringcentral/mfe-shared';
import { global } from '@ringcentral/mfe-shared';
import { identifierContainer } from '../constants';
import { isSPAMode } from '../meta';

export const onMounted = ({
  target,
  name,
  id,
  type,
}: {
  target: HTMLElement;
  name: string;
  id: string;
  type: string;
}) => {
  if (isSPAMode() || !global[identifierContainer].styles) return;
  const { styles, renderContainers } = global[identifierContainer];
  styles[name] = styles[name] ?? {};
  const insertedStyle: InsertedStyle = styles[name];
  insertedStyle.targets?.splice(
    insertedStyle.targets.findIndex(
      (insertedTarget) => insertedTarget === target
    ),
    1
  );
  renderContainers[id] = {
    name,
    type,
    timestamp: Date.now(),
  };
};
