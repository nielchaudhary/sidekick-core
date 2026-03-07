import Debug from 'debug';

const globalContext = 'sidekick-core';

export const globalLogger = Debug(globalContext);

export enum LoggingLevel {
  INFO = 'INFO',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export class Logger {
  public static loggers: { [key: string]: Logger } = {};

  private logInfo: Debug.IDebugger;
  private logError: Debug.IDebugger;
  private logDebug: Debug.IDebugger;

  private loggingLevel: LoggingLevel;

  constructor(loggingContext: string) {
    this.logInfo = globalLogger.extend(':' + loggingContext + '::[INFO]');
    this.logError = globalLogger.extend(':' + loggingContext + '::[ERROR]');
    this.logDebug = globalLogger.extend(':' + loggingContext + '::[DEBUG]');

    this.logInfo.log = this.log.bind(this);

    this.logDebug.log = this.log.bind(this);

    this.loggingLevel = LoggingLevel.INFO;

    Logger.loggers[loggingContext] = this;
  }

  private log(message: string, ...args: unknown[]) {
    const logger = Logger.loggers[globalContext] || console;
    logger.info(message, ...args);
  }

  public info = (arg: unknown, ...args: unknown[]): void => {
    if ([LoggingLevel.INFO, LoggingLevel.DEBUG].includes(this.loggingLevel)) {
      this.logInfo(arg, ...args);
    }
  };

  public error = (arg: unknown, ...args: unknown[]): void => {
    if ([LoggingLevel.ERROR, LoggingLevel.INFO, LoggingLevel.DEBUG].includes(this.loggingLevel)) {
      this.logError(arg, ...args);
    }
  };

  public debug = (arg: unknown, ...args: unknown[]): void => {
    if (this.loggingLevel === LoggingLevel.DEBUG) {
      this.logDebug(arg, ...args);
    }
  };

  public setLoggingLevel(level: LoggingLevel): void {
    this.loggingLevel = level;
  }
}
