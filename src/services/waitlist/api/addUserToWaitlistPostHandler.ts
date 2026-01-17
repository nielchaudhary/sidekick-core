import type { NextFunction, Request, Response } from 'express';
import type { IWaitlistDetails } from '../types.ts';
import { Logger } from '../../../config/logger.ts';
import { wrapSidekickError } from '../../../config/exceptions.ts';

const logger = new Logger('addUserToWaitlistPostHandler');

export const addUserToWaitlistPostHandler = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const {
    name,
    email,
    occupation,
    companySize = '',
    primaryUseCase = '',
  } = req.body as IWaitlistDetails;

  try {
  } catch (error) {
    logger.error(`Could not add due to : ${wrapSidekickError(error)}`);
    return res.status(500).send('Failed to add user to waitlist, please investigate.');
  }
};
