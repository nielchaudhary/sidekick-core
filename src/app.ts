import express from 'express';
import { Logger } from './config/logger.ts';
const app = express();

const logger = new Logger('platform-server');

app.listen(8090, () => {
  logger.info('sidekick-platform live on port 8090');
});
