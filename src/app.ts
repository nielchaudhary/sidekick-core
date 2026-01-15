import express from 'express';
import { Logger } from './config/logger.ts';
import { Env } from './config/env.ts';
import { initDB, closeDB } from './config/database.ts';
import { SidekickPlatformError } from './config/exceptions.ts';

const sidekickPlatform = express();
const logger = new Logger('platform-server');
const PORT = 8090;

const gracefulShutdown = async (signal: string) => {
  logger.debug(`Received ${signal}. Shutting down gracefully...`);

  try {
    await closeDB();
    logger.info('Server Cleanup Completed');
    process.exit(0);
  } catch (error) {
    const sidekickError = SidekickPlatformError.internal('Error during shutdown');

    logger.error(error, sidekickError);
    process.exit(1);
  }
};

Env.initEnvironmentVars();
logger.info('Loaded Sidekick Platform environment variables');

initDB()
  .then(() => {
    logger.info('Database connected successfully');

    sidekickPlatform.listen(PORT, () => {
      logger.info(`Sidekick Platform LIVE ON PORT: ${PORT}`);
    });
  })
  .catch((err: Error) => {
    const error =
      err instanceof SidekickPlatformError
        ? err
        : SidekickPlatformError.internal('Failed to boot server', err);

    logger.error(error.message, error);
    process.exit(1);
  });

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
