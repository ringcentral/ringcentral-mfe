import {
  logger as baseLogger,
  getLoggerPrefix,
  logCoreManager,
} from '../shared/logger';

logCoreManager.enable();
const logger = baseLogger.prefix(getLoggerPrefix('Worker'));

export { logger };
