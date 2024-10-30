import { global } from '@ringcentral/mfe-shared';
import { identifierContainer } from './constants';

export const isSPAMode = () => !global[identifierContainer];

export const getMeta = (name?: string) => {
  if (isSPAMode()) {
    return null;
  }
  global[identifierContainer].entry = global.location.href;
  const {
    main,
    registry,
    registryType,
    registryAutoFetch,
    version,
    entry,
    modules,
    renderContainers,
  } = global[identifierContainer];
  return {
    name,
    data: {
      main,
      registry,
      registryType,
      registryAutoFetch,
      version,
      entry,
      modules,
      renderContainers,
    },
    loaded: Object.keys(modules),
    rendered: Object.keys(renderContainers),
  };
};

export const getWorkerName = (name: string) => {
  const metaData = getMeta();
  const dependencies = metaData
    ? metaData.data.modules[metaData.data.main]?.dependencies ?? {}
    : {};
  return `${name}#${btoa(JSON.stringify(dependencies))}`;
};
