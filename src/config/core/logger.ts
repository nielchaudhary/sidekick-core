import Debug from 'debug';
import { Axiom } from '@axiomhq/js';
import dotenv from 'dotenv';
dotenv.config();

const globalContext = 'sidekick-core';

export const globalLogger = Debug(globalContext);

export enum LoggingLevel {
  INFO = 'INFO',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

const axiom = new Axiom({ token: process.env.AXIOM_TOKEN! });
const AXIOM_DATASET = process.env.AXIOM_DATASET!;
const FLUSH_INTERVAL_MS = 5000;
const FLUSH_BATCH_SIZE = 100;

let buffer: Record<string, unknown>[] = [];

export const flushToAxiom = async (): Promise<void> => {
  if (buffer.length === 0) {
    return;
  }
  const batch = buffer.splice(0, buffer.length);

  try {
    axiom.ingest(AXIOM_DATASET, batch);
    await axiom.flush();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    // requeue the batch so logs aren't lost
    buffer.unshift(...batch);
  }
};

// Periodic flush
export const commitPeriodicAxiomFlush = () => {
  const flushTimer = setInterval(flushToAxiom, FLUSH_INTERVAL_MS);
  flushTimer.unref(); // don't keep the process alive just for logging
};

const queueAxiomLog = (level: LoggingLevel, context: string, message: unknown, args: unknown[]): void => {
  buffer.push({
    _time: new Date().toISOString(),
    level,
    context,
    environment: Logger.environment,
    message: typeof message === 'string' ? message : JSON.stringify(message),
    args: args.length > 0 ? args : undefined,
    service: globalContext,
  });

  if (buffer.length >= FLUSH_BATCH_SIZE) {
    void flushToAxiom();
  }
};

export class Logger {
  public static loggers: { [key: string]: Logger } = {};

  public static environment: string = process.env.NODE_ENV || 'development';

  private logInfo: Debug.IDebugger;
  private logError: Debug.IDebugger;
  private logDebug: Debug.IDebugger;

  private loggingContext: string;
  private loggingLevel: LoggingLevel;

  constructor(loggingContext: string) {
    this.loggingContext = loggingContext;

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
      queueAxiomLog(LoggingLevel.INFO, this.loggingContext, arg, args);
    }
  };

  public error = (arg: unknown, ...args: unknown[]): void => {
    if ([LoggingLevel.ERROR, LoggingLevel.INFO, LoggingLevel.DEBUG].includes(this.loggingLevel)) {
      this.logError(arg, ...args);
      queueAxiomLog(LoggingLevel.ERROR, this.loggingContext, arg, args);
    }
  };

  public debug = (arg: unknown, ...args: unknown[]): void => {
    if (this.loggingLevel === LoggingLevel.DEBUG) {
      this.logDebug(arg, ...args);
      queueAxiomLog(LoggingLevel.DEBUG, this.loggingContext, arg, args);
    }
  };

  public setLoggingLevel(level: LoggingLevel): void {
    this.loggingLevel = level;
  }
}
