import Anthropic from '@anthropic-ai/sdk';

import { SIDEKICK_DEFAULT_PROMPT } from '../prompts/sidekick-default.ts';
import { SidekickCoreEnv } from '../config/env.ts';
import { Logger } from '../config/logger.ts';
import {
  AnthropicContentBlockNames,
  AnthropicContentBlockTypes,
  AnthropicEventTypes,
  RoleTypes,
} from '../config/types.ts';

import { type StreamHandlers } from './config.ts';

const logger = new Logger('anthropic');

const anthropicClient = new Anthropic({
  apiKey: SidekickCoreEnv.get('ANTHROPIC_API_KEY'),
});

const buildSystemPrompt = (systemPrompt?: string): string =>
  systemPrompt ? `${SIDEKICK_DEFAULT_PROMPT}\n\n${systemPrompt}` : SIDEKICK_DEFAULT_PROMPT;

const createStream = (prompt: string, system: string) =>
  anthropicClient.messages.stream({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    system,
    messages: [
      {
        role: RoleTypes.USER,
        content: prompt,
      },
    ],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: 1,
      },
    ],
    cache_control: { type: 'ephemeral' },
  });

const isWebSearchStart = (event: any): boolean =>
  event.type === AnthropicEventTypes.CONTENT_BLOCK_START &&
  event.content_block?.type === AnthropicContentBlockTypes.SERVER_TOOL_USE &&
  event.content_block?.name === AnthropicContentBlockNames.WEB_SEARCH;

const isTextDelta = (event: any): boolean =>
  event.type === AnthropicEventTypes.CONTENT_BLOCK_DELTA && event.delta?.type === 'text_delta';

const processStream = async (stream: AsyncIterable<any>, { onChunk, onStatus }: StreamHandlers) => {
  let webSearchEmitted = false;

  for await (const event of stream) {
    if (!webSearchEmitted && onStatus && isWebSearchStart(event)) {
      webSearchEmitted = true;
      onStatus('web_search_active');
      continue;
    }

    if (isTextDelta(event)) {
      onChunk(event.delta.text);
    }
  }
};

export const streamTextUsingAnthropic = async (
  prompt: string,
  onChunk: (text: string) => void,
  systemPrompt?: string,
  onStatus?: (status: string) => void
): Promise<void> => {
  try {
    const system = buildSystemPrompt(systemPrompt);

    const stream = createStream(prompt, system);

    await processStream(stream, onStatus ? { onChunk, onStatus } : { onChunk });
  } catch (error) {
    logger.error('Anthropic stream failed', error);
    throw error;
  }
};
