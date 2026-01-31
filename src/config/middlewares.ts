import type { Request, Response, NextFunction } from 'express';
import { Ratelimiter } from './ratelimiter.ts';

const ratelimiter = new Ratelimiter();

export const checkRateLimit = (req: Request, res: Response, next: NextFunction) => {
  if (ratelimiter.allowRequest()) {
    next();
  } else {
    return res.status(429).json({
      message: 'Too many requests. Please try again later.',
    });
  }
};
