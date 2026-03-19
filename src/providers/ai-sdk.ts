import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

import { SIDEKICK_DEFAULT_PROMPT } from '../prompts/sidekick-default.ts';
import { SidekickCoreEnv } from '../config/core/env.ts';
import { Logger } from '../config/core/logger.ts';
import { RoleTypes } from '../config/core/types.ts';

const logger = new Logger('ai-sdk');

const anthropic = createAnthropic({
  apiKey: SidekickCoreEnv.get('ANTHROPIC_API_KEY'),
});

const buildSystemPrompt = (systemPrompt?: string): string =>
  systemPrompt ? `${SIDEKICK_DEFAULT_PROMPT}\n\n${systemPrompt}` : SIDEKICK_DEFAULT_PROMPT;

export const streamTextUsingAiSdk = async (
  prompt: string,
  onChunk: (text: string) => void,
  systemPrompt?: string,
  onStatus?: (status: string) => void
): Promise<void> => {
  try {
    let webSearchEmitted = false;

    const result = streamText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: buildSystemPrompt(systemPrompt),
      messages: [{ role: RoleTypes.USER, content: prompt }],
      maxOutputTokens: 1024,
      tools: {
        web_search: anthropic.tools.webSearch_20250305({
          maxUses: 1,
        }),
      },
      onChunk({ chunk }) {
        if (!webSearchEmitted && onStatus && chunk.type === 'tool-call' && chunk.toolName === 'web_search') {
          webSearchEmitted = true;
          onStatus('web_search_active');
        }
      },
      providerOptions: {
        anthropic: {
          cacheControl: { type: 'ephemeral' },
        },
      },
    });

    const reader = result.textStream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      onChunk(value);
    }
  } catch (error) {
    logger.error('AI SDK stream failed', error);
    throw error;
  }
};
