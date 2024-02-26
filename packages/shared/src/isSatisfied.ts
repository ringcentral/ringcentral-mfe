import type { RegistryData } from './interface';
import type { satisfiesVersion as SatisfiesVersion } from './satisfiesVersion';

export const isSatisfied = (
  satisfiesVersion: typeof SatisfiesVersion,
  options: Partial<RegistryData> | undefined,
  dependencyVersion: string
): options is RegistryData => {
  let matchResult = false;
  try {
    matchResult = options
      ? satisfiesVersion(options.version!, dependencyVersion)
      : matchResult;
  } catch (e) {
    //
  }
  return !!(
    options?.entry &&
    (dependencyVersion === '*' || matchResult || options.forcedVersion)
  );
};
