import type { Request, Response, NextFunction } from 'express';
import { generateText } from 'ai';
import { Logger } from '../../../config/core/logger.ts';
import { getModel } from '../../../providers/llm.ts';

const logger = new Logger('generateTitlePostHandler');

const TITLE_SYSTEM_PROMPT = `Generate a short, descriptive title (3-6 words) for this conversation.
The title should capture the main topic or intent.
Do not use quotes, punctuation, or prefixes like "Title:".
Just return the title text and nothing else.`;

const TITLE_MODEL_ID = 'gemini-3.1-flash-lite';
const ASSISTANT_MESSAGE_MAX_LENGTH = 500;

export const generateTitlePostHandler = async (req: Request, res: Response, _next: NextFunction) => {
  const { userMessage, assistantMessage, modelId } = req.body as {
    userMessage: string;
    assistantMessage: string;
    modelId?: string;
  };

  if (!userMessage || !assistantMessage) {
    return res.status(400).json({ success: false, error: 'userMessage and assistantMessage are required' });
  }

  const truncatedAssistant = assistantMessage.slice(0, ASSISTANT_MESSAGE_MAX_LENGTH);
  const prompt = `User: ${userMessage}\nAssistant: ${truncatedAssistant}`;

  try {
    const { model } = getModel(modelId ?? TITLE_MODEL_ID);

    const result = await generateText({
      model,
      system: TITLE_SYSTEM_PROMPT,
      prompt,
      maxOutputTokens: 20,
    });

    const title = result.text.trim();
    logger.info(`Generated title: "${title}"`);

    return res.json({ success: true, title });
  } catch (error) {
    logger.error('Title generation failed', error);
    return res.status(500).json({ success: false, error: 'Title generation failed' });
  }
};
