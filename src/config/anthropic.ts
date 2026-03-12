import { SIDEKICK_DEFAULT_PROMPT } from '../prompts/sidekick-default.ts';
import Anthropic from '@anthropic-ai/sdk';
import { SidekickCoreEnv } from './env.ts';
import { Logger } from './logger.ts';
import {
  AnthropicContentBlockNames,
  AnthropicContentBlockTypes,
  AnthropicEventTypes,
  RoleTypes,
} from './types.ts';

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

    // const stream = anthropicClient.messages.stream({
    //   model: 'claude-sonnet-4-5-20250929',
    //   max_tokens: 1024,
    //   system: finalSystemPrompt,
    //   tools: [
    //     {
    //       type: 'web_search_20250305',
    //       name: 'web_search',
    //       max_uses: 1,
    //     },
    //   ],
    //   messages: [{ role: RoleTypes.USER, content: prompt }],
    // cache_control: { type: 'ephemeral' },

    // });

    //cheap one for now
    const stream = anthropicClient.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: finalSystemPrompt,
      messages: [{ role: RoleTypes.USER, content: prompt }],
      cache_control: { type: 'ephemeral' },
    });

    for await (const event of stream) {
      if (
        !webSearchEmitted &&
        onStatus &&
        event.type === AnthropicEventTypes.CONTENT_BLOCK_START &&
        event.content_block.type === AnthropicContentBlockTypes.SERVER_TOOL_USE &&
        event.content_block.name === AnthropicContentBlockNames.WEB_SEARCH
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
