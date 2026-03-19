import type { NextFunction, Request, Response } from 'express';
import { Logger } from '../../../config/core/logger.ts';
import { wrapSidekickError } from '../../../config/core/exceptions.ts';
import { waitlistRequestSchema, type IWaitlistDetails } from '../types.ts';
import { getMongoDBColl, WAITLIST_COLLECTION } from '../../../config/database/mongoDB.ts';
import { generateUserId } from '../../../config/core/predicates.ts';
import { sendSidekickWaitlistMail } from '../../mailer/config.ts';

const logger = new Logger('addUserToWaitlistPostHandler');

export const addUserToWaitlistPostHandler = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    const parsedWaitlistRequest = waitlistRequestSchema.safeParse(req.body);

    if (!parsedWaitlistRequest.success) {
      logger.error(`Invalid waitlist request: ${wrapSidekickError(parsedWaitlistRequest.error)}`);
      return res.status(400).json({
        message: 'Invalid request payload',
      });
    }

    const { email, occupation } = parsedWaitlistRequest.data;

    const waitlistCollection = await getMongoDBColl(WAITLIST_COLLECTION);

    const existingUser = await waitlistCollection.findOne({ email });

    if (existingUser) {
      return res.status(200).json({
        success: true,
        message: 'You have already signed up for the waitlist',
      });
    }

    const waitlistData: IWaitlistDetails = {
      email,
      occupation: occupation as IWaitlistDetails['occupation'],
      userId: generateUserId(),
    };

    await waitlistCollection.insertOne(waitlistData);

    logger.info('Inserted user data in DB successfully');

    // Fire-and-forget: don't block the response on email delivery
    sendSidekickWaitlistMail(email).catch((err) => {
      logger.error('Failed to send waitlist email:', err);
    });

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
