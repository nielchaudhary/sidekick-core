import { Redis } from '@upstash/redis';
import { Logger } from './logger.ts';
import { isNullOrUndefined } from './predicates.ts';
import { getErrorDetails, SidekickPlatformError } from './exceptions.ts';
import { Env } from './env.ts';

const logger = new Logger('redis');
const redisUrl = Env.get('UPSTASH_REDIS_REST_URL');
const redisToken = Env.get('UPSTASH_REDIS_REST_TOKEN');

class Cache {
  public static client: Redis;
  public static initialized = false;

  public static async init(): Promise<void> {
    if (Cache.initialized) {
      return;
    }

    if (isNullOrUndefined(redisUrl)) {
      throw SidekickPlatformError.cache(
        'UPSTASH_REDIS_REST_URL is not defined in environment variables'
      );
    }

    if (isNullOrUndefined(redisToken)) {
      throw SidekickPlatformError.cache(
        'UPSTASH_REDIS_REST_TOKEN is not defined in environment variables'
      );
    }

    try {
      logger.info('Connecting to Redis...');
      Cache.client = new Redis({
        url: redisUrl!,
        token: redisToken!,
      });

      // Verify connection
      await Cache.client.ping();
      Cache.initialized = true;
      logger.info('Sidekick-Platform Cache Connection Initialised');
    } catch (error) {
      logger.error('Failed to connect to Redis: ', getErrorDetails(error));
      throw SidekickPlatformError.cache('Failed to connect to Redis');
    }
  }

  public static async close(): Promise<void> {
    // Upstash REST client is stateless, no connection to close
    Cache.initialized = false;
    logger.info('Cache client reset');
  }
}

export const initCache = async (): Promise<void> => {
  if (!Cache.initialized) {
    await Cache.init();
  }
};

export const closeCache = async (): Promise<void> => {
  await Cache.close();
};

export const getCache = async (): Promise<Redis> => {
  if (!Cache.client) {
    await initCache();
  }
  return Cache.client;
};

// Typed cache operations
export const cache = {
  async get<T = unknown>(key: string): Promise<T | null> {
    const client = await getCache();
    try {
      return await client.get<T>(key);
    } catch (error) {
      logger.error(`Cache get failed for key ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to get key: ${key}`);
    }
  },

  async set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const client = await getCache();
    try {
      if (ttlSeconds) {
        await client.set(key, value, { ex: ttlSeconds });
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      logger.error(`Cache set failed for key ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to set key: ${key}`);
    }
  },

  async del(key: string): Promise<void> {
    const client = await getCache();
    try {
      await client.del(key);
    } catch (error) {
      logger.error(`Cache del failed for key ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to delete key: ${key}`);
    }
  },

  async exists(key: string): Promise<boolean> {
    const client = await getCache();
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists check failed for key ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to check key existence: ${key}`);
    }
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const client = await getCache();
    try {
      await client.expire(key, ttlSeconds);
    } catch (error) {
      logger.error(`Cache expire failed for key ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to set expiry for key: ${key}`);
    }
  },

  async incr(key: string): Promise<number> {
    const client = await getCache();
    try {
      return await client.incr(key);
    } catch (error) {
      logger.error(`Cache incr failed for key ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to increment key: ${key}`);
    }
  },

  async ttl(key: string): Promise<number> {
    const client = await getCache();
    try {
      return await client.ttl(key);
    } catch (error) {
      logger.error(`Cache ttl check failed for key ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to get TTL for key: ${key}`);
    }
  },

  // Hash operations for user sessions, structured data
  async hget<T = unknown>(key: string, field: string): Promise<T | null> {
    const client = await getCache();
    try {
      return await client.hget<T>(key, field);
    } catch (error) {
      logger.error(`Cache hget failed for ${key}.${field}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to hget: ${key}.${field}`);
    }
  },

  async hset<T = unknown>(key: string, field: string, value: T): Promise<void> {
    const client = await getCache();
    try {
      await client.hset(key, { [field]: value });
    } catch (error) {
      logger.error(`Cache hset failed for ${key}.${field}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to hset: ${key}.${field}`);
    }
  },

  async hdel(key: string, ...fields: string[]): Promise<void> {
    const client = await getCache();
    try {
      await client.hdel(key, ...fields);
    } catch (error) {
      logger.error(`Cache hdel failed for ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to hdel: ${key}`);
    }
  },

  // List operations for queues, use later
  async lpush<T = unknown>(key: string, ...values: T[]): Promise<number> {
    const client = await getCache();
    try {
      return await client.lpush(key, ...values);
    } catch (error) {
      logger.error(`Cache lpush failed for ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to lpush: ${key}`);
    }
  },

  async rpop<T = unknown>(key: string): Promise<T | null> {
    const client = await getCache();
    try {
      return await client.rpop<T>(key);
    } catch (error) {
      logger.error(`Cache rpop failed for ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to rpop: ${key}`);
    }
  },

  async lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]> {
    const client = await getCache();
    try {
      return await client.lrange<T>(key, start, stop);
    } catch (error) {
      logger.error(`Cache lrange failed for ${key}: `, getErrorDetails(error));
      throw SidekickPlatformError.cache(`Failed to lrange: ${key}`);
    }
  },
};

export const CacheKeys = {
  userSession: (userId: string) => `session:${userId}`,
  userRateLimit: (userId: string) => `ratelimit:${userId}`,
  integrationToken: (userId: string, provider: string) => `integration:${userId}:${provider}`,
  syncLock: (userId: string, provider: string) => `synclock:${userId}:${provider}`,
  queryCache: (hash: string) => `query:${hash}`,
} as const;
