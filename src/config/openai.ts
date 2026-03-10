import OpenAI from 'openai';
import { SidekickCoreEnv } from './env.ts';
import { Logger } from './logger.ts';

const OPENAI_API_KEY = SidekickCoreEnv.get('OPENAI_API_KEY');

const logger = new Logger('openai');
export const openAIClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export const streamTextUsingOpenAI = async (
  prompt: string,
  onChunk: (text: string) => void,
  systemPrompt?: string
): Promise<void> => {
  try {
    const input: OpenAI.Responses.ResponseInputItem[] = [];
    if (systemPrompt) {
      input.push({ role: 'system', content: systemPrompt });
    }
    input.push({ role: 'user', content: prompt });

    const stream = await openAIClient.responses.create({
      model: 'gpt-5',
      input,
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'response.output_text.delta' && event.delta) {
        onChunk(event.delta);
      }
    }
  } catch (error) {
    logger.error('Stream failed:', error);
    throw error;
  }
};
