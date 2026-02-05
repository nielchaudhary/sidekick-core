import type { NextFunction, Request, Response } from 'express';
import { Logger } from '../../../config/logger.ts';
import { wrapSidekickError } from '../../../config/exceptions.ts';
import { waitlistRequestSchema, type IWaitlistDetails } from '../types.ts';
import { getDBColl, WAITLIST_COLLECTION } from '../../../config/database.ts';
import { generateUserId } from '../../../config/predicates.ts';

const logger = new Logger('addUserToWaitlistPostHandler');

export const addUserToWaitlistPostHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const parsedWaitlistRequest = waitlistRequestSchema.safeParse(req.body);

    if (!parsedWaitlistRequest.success) {
      logger.error(`Invalid waitlist request: ${wrapSidekickError(parsedWaitlistRequest.error)}`);
      return res.status(400).json({
        message: 'Invalid request payload',
      });
    }

    const { email, occupation } = parsedWaitlistRequest.data;

    const waitlistCollection = await getDBColl(WAITLIST_COLLECTION);

    await waitlistCollection.insertOne({
      email,
      occupation,
      userId: generateUserId(),
    } as IWaitlistDetails);

    return res.status(200).json({
      success: true,
      message: 'User Added to Waitlist Successfully',
    });
  } catch (error) {
    logger.error(`Could not add due to : ${wrapSidekickError(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to add user to waitlist, please investigate.',
    });
  }
};
