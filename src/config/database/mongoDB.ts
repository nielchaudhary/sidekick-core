import { Collection, MongoClient } from 'mongodb';
import type { Document as MongoDBDoc } from 'mongodb';
import { Logger } from '../core/logger.ts';
import { isNullOrUndefined } from '../core/predicates.ts';
import { getErrorDetails, SidekickPlatformError } from '../core/exceptions.ts';
import { SidekickCoreEnv } from '../core/env.ts';

import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('database');
const mongoURI = SidekickCoreEnv.get('mongoURI');
export const DB_NAME = 'sidekick-core';
export const USERS_COLLECTION = 'users';
export const WAITLIST_COLLECTION = 'waitlist';

class MongoDB {
  public static client: MongoClient;
  public static users: Collection<MongoDBDoc>;
  public static waitlist: Collection<MongoDBDoc>;

  public static async init(): Promise<void> {
    if (isNullOrUndefined(mongoURI)) {
      throw SidekickPlatformError.database('mongoURI is not defined in environment variables');
    }

    try {
      logger.info(`Connecting to MongoDB...`);
      MongoDB.client = await new MongoClient(mongoURI!, { tls: true }).connect();
      MongoDB.users = MongoDB.client.db(DB_NAME).collection(USERS_COLLECTION);
      MongoDB.waitlist = MongoDB.client.db(DB_NAME).collection(WAITLIST_COLLECTION);
      logger.info('Sidekick-Core DB Connection Initialised');
    } catch (error) {
      logger.error('Failed to connect to MongoDB due to : ', getErrorDetails(error));
      throw SidekickPlatformError.database('Failed to connect to MongoDB');
    }
  }

  public static async close(): Promise<void> {
    try {
      logger.info('Closing MongoDB connection...');
      await MongoDB.client.close();
      logger.info('Closed MongoDB conection...');
    } catch (error) {
      logger.error('Failed to close MongoDB connection: ', getErrorDetails(error));
      throw SidekickPlatformError.database('Failed to close MongoDB connection');
    }
  }
}

export const initMongoDB = async (): Promise<void> => {
  if (!MongoDB.client) {
    await MongoDB.init();
  }
};

export const closeMongoDB = async (): Promise<void> => {
  if (MongoDB.client) {
    await MongoDB.close();
  }
};

export const getMongoDBColl = async <T extends MongoDBDoc = MongoDBDoc>(collName: string): Promise<Collection<T>> => {
  if (!MongoDB.client) {
    await initMongoDB();
  }
  return MongoDB.client.db(DB_NAME).collection(collName) as Collection<T>;
};
