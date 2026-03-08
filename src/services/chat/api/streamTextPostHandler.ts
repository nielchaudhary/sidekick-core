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

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const streamFn =
      llmProvider === LLMProviders.OPENAI ? streamTextUsingOpenAI : streamTextUsingAnthropic;

    await streamFn(prompt, (chunk: string) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error(error);
    res.write(`data: ${JSON.stringify({ error: 'LLM stream failed' })}\n\n`);
    res.end();
  }
};
