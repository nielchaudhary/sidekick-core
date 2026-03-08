import Anthropic from '@anthropic-ai/sdk';
import { SidekickCoreEnv } from './env.ts';
import { Logger } from './logger.ts';

const ANTHROPIC_API_KEY = SidekickCoreEnv.get('ANTHROPIC_API_KEY');

const logger = new Logger('anthropic');

const anthropicClient = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

export const streamTextUsingAnthropic = async (
  prompt: string,
  onChunk: (text: string) => void
): Promise<void> => {
  try {
    const stream = anthropicClient.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onChunk(event.delta.text);
      }
    }
  } catch (error) {
    logger.error('Stream failed:', error);
    throw error;
  }
};
