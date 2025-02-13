import type { RegistryData } from './interface';
import type { satisfiesVersion as SatisfiesVersion } from './satisfiesVersion';

export const isSatisfied = (
  satisfiesVersion: typeof SatisfiesVersion,
  options: Partial<RegistryData> | undefined,
  dependencyVersion: string
): options is RegistryData => {
  // To ensure consistency, it is used for webpage or other running container  mfe info satisfies version.
  if (globalThis.__RC_MFE_SATISFY__)
    return globalThis.__RC_MFE_SATISFY__(options, dependencyVersion);
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
