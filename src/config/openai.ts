import OpenAI from 'openai';
import { SidekickCoreEnv } from './env.ts';
import { Logger } from './logger.ts';

const OPENAI_API_KEY = SidekickCoreEnv.get('OPENAI_API_KEY');

const logger = new Logger('openai');
export const openAIClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const streamTextUsingOpenAI = async (prompt: string): Promise<string> => {
  try {
    const stream = await openAIClient.responses.create({
      model: 'gpt-5',
      input: [{ role: 'user', content: prompt }],
      stream: true,
    });

    let result = '';

    for await (const event of stream) {
      logger.info('Stream event:', event);
      if (event.type === 'response.output_text.delta' && event.delta) {
        result += event.delta;
      }
    }

    return result;
  } catch (error) {
    logger.error('Stream failed:', error);
    throw error;
  }
};
