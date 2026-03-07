import Anthropic from '@anthropic-ai/sdk';
import { Env } from './env.ts';
import { Logger } from './logger.ts';

const ANTHROPIC_API_KEY = Env.get('ANTHROPIC_API_KEY');

const logger = new Logger('anthropic-client');

const anthropicClient = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

export const streamTextUsingAnthropic = async (prompt: string): Promise<string> => {
  try {
    const stream = anthropicClient.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    let result = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        result += event.delta.text;
      }
    }

    return result;
  } catch (error) {
    logger.error('Stream failed:', error);
    throw error;
  }
};
