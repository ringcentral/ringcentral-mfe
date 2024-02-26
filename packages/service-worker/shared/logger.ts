import {
  logger as baseLogger,
  logCoreManager,
  getLoggerPrefix,
} from '@ringcentral/mfe-shared';

const logger = baseLogger.tags('sw');

export { logger, logCoreManager, getLoggerPrefix };
