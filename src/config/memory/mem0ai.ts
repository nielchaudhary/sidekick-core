import { MemoryClient } from 'mem0ai';
import { SidekickCoreEnv } from '../core/env.ts';

import { Logger } from '../core/logger.ts';

const logger = new Logger('mem0');

const MEM0_API_KEY = SidekickCoreEnv.get('MEM0_API_KEY');
export const mem0 = new MemoryClient({
  apiKey: MEM0_API_KEY,
});

logger.info('mem0 Client Intialised');
