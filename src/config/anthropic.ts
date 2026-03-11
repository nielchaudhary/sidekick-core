import { SIDEKICK_DEFAULT_PROMPT } from '../prompts/sidekick-default.ts';
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
  onChunk: (text: string) => void,
  systemPrompt?: string,
  onStatus?: (status: string) => void
): Promise<void> => {
  try {
    let webSearchEmitted = false;

    const finalSystemPrompt = systemPrompt
      ? `${SIDEKICK_DEFAULT_PROMPT}\n\n${systemPrompt}`
      : SIDEKICK_DEFAULT_PROMPT;

    const stream = anthropicClient.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: finalSystemPrompt,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 1,
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const event of stream) {
      if (
        !webSearchEmitted &&
        onStatus &&
        event.type === 'content_block_start' &&
        event.content_block.type === 'server_tool_use' &&
        event.content_block.name === 'web_search'
      ) {
        webSearchEmitted = true;
        onStatus('web_search_active');
      }

      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        onChunk(event.delta.text);
      }
    }
  } catch (error) {
    logger.error('Stream failed:', error);
    throw error;
  }
};
