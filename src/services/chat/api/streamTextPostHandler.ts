import type { Request, Response, NextFunction } from 'express';
import { Logger } from '../../../config/core/logger.ts';
import { streamTextUsingAiSDK } from '../../../providers/ai-sdk.ts';

const logger = new Logger('streamTextPostHandler');

export const streamTextPostHandler = async (req: Request, res: Response, _next: NextFunction) => {
  const { prompt, systemPrompt, modelId } = req.body as { prompt: string; systemPrompt?: string; modelId?: string };

  if (!prompt) {
    return res.status(400).json({ success: false, error: 'prompt is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    await streamTextUsingAiSDK(
      prompt,
      (chunk: string) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      },
      systemPrompt,
      (status: string) => {
        res.write(`data: ${JSON.stringify({ type: 'status', status })}\n\n`);
      },
      modelId
    );

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error(error);
    res.write(`data: ${JSON.stringify({ error: 'LLM stream failed' })}\n\n`);
    res.end();
  }
};
