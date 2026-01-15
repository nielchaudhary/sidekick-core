import express from 'express';
import { Logger } from './config/logger.ts';
const sidekickPlatform = express();

const logger = new Logger('platform-server');

sidekickPlatform.listen(8090, () => {
  logger.info('sidekick-platform live on port 8090');
});
