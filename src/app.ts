import express from 'express';
import { Logger } from './config/logger.ts';
import { Env } from './config/env.ts';
import { initDB, closeDB } from './config/database.ts';
import { closeCache } from './config/redis.ts';
import { SidekickPlatformError, getErrorDetails } from './config/exceptions.ts';
import { waitlistRouter } from './services/waitlist/waitlistRouterV1.ts';
import cors from 'cors';

const logger = new Logger('platform-server');
const PORT = Env.get('PORT') || 8090;

const startSidekickPlatformServer = async (): Promise<void> => {
  Env.initEnvironmentVars();
  logger.info('Loaded environment variables');

  await initDB();

  //update link and uncomment this whenever usage is required
  // await initCache();

  const sidekickPlatformServer = express();

  sidekickPlatformServer.use(express.json());
  sidekickPlatformServer.use(express.urlencoded({ extended: true }));
  sidekickPlatformServer.use(cors());

  sidekickPlatformServer.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  //api routes
  sidekickPlatformServer.use(waitlistRouter[0], waitlistRouter[1]);

  sidekickPlatformServer.listen(PORT, () => {
    logger.info(`Sidekick Platform LIVE ON PORT: ${PORT}`);
  });
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down...`);

  try {
    await Promise.all([closeDB(), closeCache()]);
    logger.info('Cleanup completed');
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown error:', getErrorDetails(error));
    process.exit(1);
  }
};

startSidekickPlatformServer().catch((err: Error) => {
  const error =
    err instanceof SidekickPlatformError
      ? err
      : SidekickPlatformError.internal('Failed to start server', err);

  logger.error('Sidekick Platform Server Bootup Failed:', error.message);
  process.exit(1);
});

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', () => gracefulShutdown('uncaughtException'));
