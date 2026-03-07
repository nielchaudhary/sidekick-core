import { Collection, MongoClient } from 'mongodb';
import type { Document as MongoDBDoc } from 'mongodb';
import { Logger } from './logger.ts';
import { isNullOrUndefined } from './predicates.ts';
import { getErrorDetails, SidekickPlatformError } from './exceptions.ts';
import { SidekickCoreEnv } from './env.ts';

import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('database');
const mongoURI = SidekickCoreEnv.get('mongoURI');
export const DB_NAME = 'sidekick-core';
export const USERS_COLLECTION = 'users';
export const WAITLIST_COLLECTION = 'waitlist';

class DB {
  public static client: MongoClient;
  public static users: Collection<MongoDBDoc>;
  public static waitlist: Collection<MongoDBDoc>;

  public static async init(): Promise<void> {
    if (isNullOrUndefined(mongoURI)) {
      throw SidekickPlatformError.database('mongoURI is not defined in environment variables');
    }

    try {
      logger.info(`Connecting to MongoDB...`);
      DB.client = await new MongoClient(mongoURI!, { tls: true }).connect();
      DB.users = DB.client.db(DB_NAME).collection(USERS_COLLECTION);
      DB.waitlist = DB.client.db(DB_NAME).collection(WAITLIST_COLLECTION);
      logger.info('Sidekick-Core DB Connection Initialised');
    } catch (error) {
      logger.error('Failed to connect to MongoDB due to : ', getErrorDetails(error));
      throw SidekickPlatformError.database('Failed to connect to MongoDB');
    }
  }

  public static async close(): Promise<void> {
    try {
      logger.info('Closing MongoDB connection...');
      await DB.client.close();
      logger.info('Closed MongoDB conection...');
    } catch (error) {
      logger.error('Failed to close MongoDB connection: ', getErrorDetails(error));
      throw SidekickPlatformError.database('Failed to close MongoDB connection');
    }
  }
}

export const initDB = async (): Promise<void> => {
  if (!DB.client) {
    await DB.init();
  }
};

export const closeDB = async (): Promise<void> => {
  if (DB.client) {
    await DB.close();
  }
};

export const getDBColl = async <T extends MongoDBDoc = MongoDBDoc>(
  collName: string
): Promise<Collection<T>> => {
  if (!DB.client) {
    await initDB();
  }
  return DB.client.db(DB_NAME).collection(collName) as Collection<T>;
};
