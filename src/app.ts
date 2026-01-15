import express from 'express';
import { Logger } from './config/logger.ts';
import { Env } from './config/env.ts';
import { initDB } from './config/database.ts';
import { gracefulShutdown, SidekickPlatformError } from './config/exceptions.ts';

const sidekickPlatform = express();
const logger = new Logger('platform-server');
const PORT = 8090;

Env.initEnvironmentVars();
logger.info('Loaded Sidekick Platform environment variables');

initDB()
  .then(() => {
    logger.info('Database connected successfully');

    sidekickPlatform.listen(PORT, () => {
      logger.info(`Sidekick Platform live on port ${PORT}`);
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
