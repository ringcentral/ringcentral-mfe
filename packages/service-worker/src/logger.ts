import { logger as baseLogger, getLoggerPrefix } from '../shared/logger';

const logger = baseLogger.prefix(getLoggerPrefix('Worker-UI-Thread'));

export { logger };
