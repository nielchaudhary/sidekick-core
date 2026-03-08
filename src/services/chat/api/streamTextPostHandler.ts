import type { Request, Response, NextFunction } from 'express';
import { Logger } from '../../../config/logger.ts';
import { LLMProviders } from '../../../config/global-constants.ts';
import { streamTextUsingOpenAI } from '../../../config/openai.ts';
import { streamTextUsingAnthropic } from '../../../config/anthropic.ts';

const logger = new Logger('streamTextPostHandler');

export const streamTextPostHandler = async (req: Request, res: Response, _next: NextFunction) => {
  const { llmProvider } = req.query as { llmProvider: LLMProviders };
  const { prompt } = req.body as { prompt: string };

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'prompt is required' });
  }

  if (!Object.values(LLMProviders).includes(llmProvider)) {
    return res.status(400).json({
      success: false,
      error: `Invalid llmProvider. Must be one of: ${Object.values(LLMProviders).join(', ')}`,
    });
  }

  try {
    const streamFn =
      llmProvider === LLMProviders.OPENAI ? streamTextUsingOpenAI : streamTextUsingAnthropic;

    const result = await streamFn(prompt);

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error(error);
    return res.status(500).json({ success: false, error: 'LLM stream failed' });
  }
};
