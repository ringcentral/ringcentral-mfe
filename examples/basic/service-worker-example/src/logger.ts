import { logger as baseLogger, getLoggerPrefix } from '@ringcentral/mfe-shared';
const logger = baseLogger
  .tags('[sw-host]')
  .prefix(getLoggerPrefix('Example', 'red'));

export { logger };
