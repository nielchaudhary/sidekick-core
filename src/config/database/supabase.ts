import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { Logger } from '../core/logger.ts';
import { isNullOrUndefined } from '../core/predicates.ts';
import { getErrorDetails, SidekickPlatformError } from '../core/exceptions.ts';
import { SidekickCoreEnv } from '../core/env.ts';

import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('supabase');
const databaseUrl = SidekickCoreEnv.get('SUPABASE_DB_URL');

class SupabaseDB {
  private static _client: postgres.Sql | null = null;
  private static _db: PostgresJsDatabase | null = null;

  public static get db(): PostgresJsDatabase {
    if (!SupabaseDB._db) {
      throw SidekickPlatformError.database('DB not initialised. Call initDB() first.');
    }
    return SupabaseDB._db;
  }

  public static get initialized(): boolean {
    return SupabaseDB._db !== null;
  }

  public static async init(): Promise<void> {
    if (isNullOrUndefined(databaseUrl)) {
      throw SidekickPlatformError.database('databaseUrl is not defined in environment variables');
    }

    try {
      logger.info('Connecting to Supabase via Drizzle...');

      SupabaseDB._client = postgres(databaseUrl, {
        max: 10, // connection pool size - pool size = CPU cores × 2 + disk spindles
        idle_timeout: 20, // seconds before idle connections close
        prepare: false, // required for Supabase connection pooler (transaction mode)
        ssl: 'require',
      });

      SupabaseDB._db = drizzle(SupabaseDB._client);

      // Verify connection
      await SupabaseDB._db.execute('SELECT 1');

      logger.info('Sidekick SupabaseDB Connection Initialised');
    } catch (error) {
      logger.error('Failed to connect to Supabase due to: ', getErrorDetails(error));
      throw SidekickPlatformError.database('Failed to connect to Supabase');
    }
  }

  public static async close(): Promise<void> {
    try {
      logger.info('Closing database connection...');
      if (SupabaseDB._client) {
        await SupabaseDB._client.end();
      }
      SupabaseDB._client = null;
      SupabaseDB._db = null;
      logger.info('Closed database connection.');
    } catch (error) {
      logger.error('Failed to close database connection: ', getErrorDetails(error));
      throw SidekickPlatformError.database('Failed to close database connection');
    }
  }
}

export const initSupabaseDB = async (): Promise<void> => {
  if (!SupabaseDB.initialized) {
    await SupabaseDB.init();
  }
};

export const closeSupabaseDB = async (): Promise<void> => {
  if (SupabaseDB.initialized) {
    await SupabaseDB.close();
  }
};

/**
 * Returns the Drizzle DB instance.
 *
 * Usage:
 *   const db = await getSupabaseDB();
 *   const allUsers = await SupabaseDB.select().from(users);
 */
export const getSupabaseDB = async (): Promise<PostgresJsDatabase> => {
  if (!SupabaseDB.initialized) {
    await initSupabaseDB();
  }
  return SupabaseDB.db;
};
