import type { Request, Response, NextFunction } from 'express';
import { Logger } from '../../../config/logger.ts';

const logger = new Logger('streamTextPostHandler');
export const streamTextPostHandler = async (req: Request, res: Response, _next: NextFunction) => {
  const llmProvider = req.query as { llmProvider: string };

  try {
  } catch (error) {
    logger.error(error);
    return res.status(500).json({
      success: false,
    });
  }
};
