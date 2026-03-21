import express from 'express';
import { Logger } from './config/core/logger.ts';
import { SidekickCoreEnv } from './config/core/env.ts';
import { initMongoDB, closeMongoDB } from './config/database/mongoDB.ts';
import { closeCache, initCache } from './config/database/redis.ts';
import { SidekickPlatformError, getErrorDetails } from './config/core/exceptions.ts';
import { waitlistRouter } from './services/waitlist/waitlistRouterV1.ts';
import { chatRouterV1 } from './services/chat/chatRouterV1.ts';
import cors from 'cors';
import { closeSupabaseDB, initSupabaseDB } from './config/database/supabase.ts';

const logger = new Logger('server');
const PORT = SidekickCoreEnv.get('PORT') || 8090;

const startSidekickPlatformServer = async (): Promise<void> => {
  SidekickCoreEnv.initEnvironmentVars();
  logger.info('Loaded environment variables');

  await initMongoDB();
  await initSupabaseDB();
  await initCache();

  const sidekickPlatformServer = express();

  sidekickPlatformServer.use(express.json());
  sidekickPlatformServer.use(express.urlencoded({ extended: true }));
  sidekickPlatformServer.use(cors());

  sidekickPlatformServer.get('/health', (_, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  //api routes
  sidekickPlatformServer.use(waitlistRouter[0], waitlistRouter[1]);
  sidekickPlatformServer.use(chatRouterV1[0], chatRouterV1[1]);

  sidekickPlatformServer.listen(PORT, () => {
    logger.info(`Sidekick Platform LIVE ON PORT: ${PORT}`);
  });
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Shutting down...`);

  try {
    await Promise.all([closeMongoDB(), closeCache(), closeSupabaseDB()]);
    logger.info('Cleanup completed');
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown error:', getErrorDetails(error));
    process.exit(1);
  }
};

startSidekickPlatformServer().catch((err: Error) => {
  const error = err instanceof SidekickPlatformError ? err : SidekickPlatformError.internal('Failed to start server', err);

  logger.error('Sidekick Platform Server Bootup Failed:', error.message);
  process.exit(1);
});

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('uncaughtException', () => gracefulShutdown('uncaughtException'));
