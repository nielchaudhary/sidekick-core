import { Collection, MongoClient } from 'mongodb';
import type { Document as MongoDBDoc } from 'mongodb';
import { Logger } from './logger.ts';
import { isNullOrUndefined } from './predicates.ts';
import { getErrorDetails, SidekickPlatformError } from './exceptions.ts';

import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('database');
const mongoURI = process.env.mongoURI;
export const DB_NAME = 'sidekick-platform';
export const usersCollection = 'users';

class DB {
  public static client: MongoClient;
  public static users: Collection<MongoDBDoc>;

  public static async init(): Promise<void> {
    if (isNullOrUndefined(mongoURI)) {
      throw SidekickPlatformError.database('mongoURI is not defined in environment variables');
    }

    try {
      logger.info(`Connecting to MongoDB...`);
      DB.client = await new MongoClient(mongoURI!, { tls: true }).connect();
      DB.users = DB.client.db(DB_NAME).collection(usersCollection);
      logger.info('beacon-core DB Connection Initialised');
    } catch (error) {
      logger.error('Failed to connect to MongoDB due to : ', getErrorDetails(error));
      throw SidekickPlatformError.database('Failed to connect to MongoDB');
    }
  }
}

export const initDB = async (): Promise<void> => {
  if (!DB.client) {
    await DB.init();
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
