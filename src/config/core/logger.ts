import Debug from 'debug';
import { Axiom } from '@axiomhq/js';

const globalContext = 'sidekick-core';

export const globalLogger = Debug(globalContext);

export enum LoggingLevel {
  INFO = 'INFO',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

//axiom batching layer
const axiom = process.env.AXIOM_TOKEN ? new Axiom({ token: process.env.AXIOM_TOKEN }) : null;

const AXIOM_DATASET = process.env.AXIOM_DATASET || 'sidekick-logs';
const FLUSH_INTERVAL_MS = 5000;
const FLUSH_BATCH_SIZE = 100;

let buffer: Record<string, unknown>[] = [];

const flushToAxiom = async (): Promise<void> => {
  if (!axiom || buffer.length === 0) {
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
const flushTimer = setInterval(flushToAxiom, FLUSH_INTERVAL_MS);
flushTimer.unref(); // don't keep the process alive just for logging

const shutdownFlush = async () => {
  await flushToAxiom();
};
process.on('beforeExit', shutdownFlush);
process.on('SIGTERM', async () => {
  await shutdownFlush();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await shutdownFlush();
  process.exit(0);
});

const queueAxiomLog = (level: LoggingLevel, context: string, message: unknown, args: unknown[]): void => {
  if (!axiom) {
    return;
  }
  buffer.push({
    _time: new Date().toISOString(),
    level,
    context,
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
