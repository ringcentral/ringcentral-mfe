/* eslint-disable consistent-return */
/* eslint-disable guard-for-in */
import { global } from '@ringcentral/mfe-shared';
import { identifierContainer } from '../constants';
import { MFEConfig } from '../interface';

// TODO consider if dependency is reference by many module
export const getConfigByDependency = (name: string) => {
  const { modules } = global[identifierContainer];
  for (const key in modules) {
    const config: MFEConfig = modules[key];
    if (config.dependencies[name]) {
      return config;
    }
  }
  if (__DEV__) {
    throw new Error(`[MFE] '${name}' is not a valid dependency.`);
  }
};

export const getConfig = (name: string) => {
  const config = getConfigByDependency(name);
  if (__DEV__ && !config) {
    throw new Error(
      `[MFE] ${name} config is not defined, make sure to use 'ModuleFederationPlugin' in '@ringcentral/mfe-builder' and set valid config for '@ringcentral/mfe-builder'.`
    );
  }
  return {
    dependencies: config!.dependencies,
    name: config!.name,
    registry: global[identifierContainer].registry,
  };
};
