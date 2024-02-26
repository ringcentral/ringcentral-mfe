/* eslint-disable no-unused-expressions */
/* eslint-disable lines-between-class-members */
/*
 * @Author: Paynter Chen
 * @Date: 2022-09-23 19:27:37
 * @Last Modified by: mikey.zhaopeng
 * @Last Modified time: 2023-04-04 23:59:56
 */

interface ILoggerCore {
  log(...params: any[]): void;
  debug(...params: any[]): void;
  info(...params: any[]): void;
  warn(...params: any[]): void;
  error(...params: any[]): void;
}
interface ILogger extends ILoggerCore {
  tags(...tags: string[]): ILogger;
  prefix(prefix: string[]): ILogger;
}

const logOption = {
  enable: false,
};

class ConsoleLoggerCore implements ILoggerCore {
  log(...params: any): void {
    console.log(...params);
  }
  debug(...params: any): void {
    console.debug(...params);
  }
  info(...params: any): void {
    console.info(...params);
  }
  warn(...params: any): void {
    console.warn(...params);
  }
  error(...params: any): void {
    console.error(...params);
  }
}

const logCoreManager = (() => {
  const consoleLogCore: ILoggerCore = new ConsoleLoggerCore();
  let customLogCore: ILoggerCore;
  return {
    get(): ILoggerCore {
      return customLogCore || consoleLogCore;
    },
    setCustomLogCore(core: ILoggerCore) {
      customLogCore = core;
    },
    enable(enable = true) {
      logOption.enable = enable;
    },
  };
})();

class Logger implements ILogger {
  _tagsString: string;
  _prefix: string[] = [];

  constructor(public _tags: string[] = []) {
    this._tagsString = _tags.join(',');
  }

  prefix(prefix: string[]) {
    this._prefix = prefix;
    return this;
  }

  tags(...tags: string[]): ILogger {
    return new Logger([...this._tags, ...tags]);
  }

  log(...params: any): void {
    logOption.enable &&
      logCoreManager.get().log(...this._prefix, this._tagsString, ...params);
  }
  debug(...params: any): void {
    logOption.enable &&
      logCoreManager.get().debug(...this._prefix, this._tagsString, ...params);
  }
  info(...params: any): void {
    logOption.enable &&
      logCoreManager.get().info(...this._prefix, this._tagsString, ...params);
  }
  warn(...params: any): void {
    logOption.enable &&
      logCoreManager.get().warn(...this._prefix, this._tagsString, ...params);
  }
  error(...params: any): void {
    logOption.enable &&
      logCoreManager.get().error(...this._prefix, this._tagsString, ...params);
  }
}

const getStyles = (backgroundColor: string) => {
  return [
    `background: ${backgroundColor}`,
    `border-radius: 0.5em`,
    `color: white`,
    `font-weight: bold`,
    `padding: 2px 0.5em`,
  ].join(';');
};

const commonPrefixStyles = getStyles(`#7f8c8d`);

const getLoggerPrefix = (prefixText: string, color?: string) => [
  `%c${prefixText}`,
  color ? getStyles(color) : commonPrefixStyles,
];

const logger = new Logger(['@rc-mfe']);

export type { ILogger };

export { logger, logCoreManager, getLoggerPrefix };
