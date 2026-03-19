import { streamText } from 'ai';

import { SIDEKICK_DEFAULT_PROMPT } from '../prompts/sidekick-default.ts';
import { Logger } from '../config/core/logger.ts';
import { RoleTypes } from '../config/core/types.ts';
import { getModel } from './llm.ts';

const logger = new Logger('ai-sdk');

const buildSystemPrompt = (systemPrompt?: string): string =>
  systemPrompt ? `${SIDEKICK_DEFAULT_PROMPT}\n\n${systemPrompt}` : SIDEKICK_DEFAULT_PROMPT;

export const streamTextUsingAiSDK = async (
  prompt: string,
  onChunk: (text: string) => void,
  systemPrompt?: string,
  onStatus?: (status: string) => void,
  modelId?: string
): Promise<void> => {
  try {
    const { model, tools, providerOptions } = getModel(modelId);

    let webSearchEmitted = false;

    const result = streamText({
      model,
      system: buildSystemPrompt(systemPrompt),
      messages: [{ role: RoleTypes.USER, content: prompt }],
      maxOutputTokens: 1024,
      ...(tools && { tools }),
      ...(providerOptions && { providerOptions }),
      onChunk({ chunk }) {
        if (!webSearchEmitted && onStatus && chunk.type === 'tool-call' && chunk.toolName === 'web_search') {
          webSearchEmitted = true;
          onStatus('web_search_active');
        }
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
