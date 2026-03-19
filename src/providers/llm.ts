import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import type { LanguageModel } from 'ai';

import { SidekickCoreEnv } from '../config/core/env.ts';
import { Logger } from '../config/core/logger.ts';

const logger = new Logger('llm');

const anthropic = createAnthropic({ apiKey: SidekickCoreEnv.get('ANTHROPIC_API_KEY') });
const openai = createOpenAI({ apiKey: SidekickCoreEnv.get('OPENAI_API_KEY') });
const google = createGoogleGenerativeAI({ apiKey: SidekickCoreEnv.get('GOOGLE_GENERATIVE_AI_API_KEY') });
const sarvam = createOpenAICompatible({
  name: 'sarvam',
  baseURL: 'https://api.sarvam.ai/v1',
  apiKey: SidekickCoreEnv.get('SARVAM_API_KEY'),
});

type StreamTextParams = Parameters<typeof streamText>[0];

type RegistryEntry = {
  model: LanguageModel;
  tools?: StreamTextParams['tools'];
  providerOptions?: StreamTextParams['providerOptions'];
};

const anthropicEntry = (modelId: string): RegistryEntry => ({
  model: anthropic(modelId),
  tools: { web_search: anthropic.tools.webSearch_20250305({ maxUses: 3 }) },
  providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
});

const REGISTRY = {
  // Anthropic
  'sonnet-4.5': anthropicEntry('claude-sonnet-4-5-20250929'),
  'opus-4.6': anthropicEntry('claude-opus-4-6'),

  // OpenAI
  'gpt-5': { model: openai('gpt-5') },

  // Google Gemini
  'gemini-3.1-pro': { model: google('gemini-3.1-pro-preview'), providerOptions: { google: { useSearchGrounding: true } } },
  'gemini-3-flash': { model: google('gemini-3-flash-preview'), providerOptions: { google: { useSearchGrounding: true } } },
  'gemini-3.1-flash-lite': { model: google('gemini-3.1-flash-lite-preview'), providerOptions: { google: { useSearchGrounding: true } } },

  // Sarvam (OpenAI-compatible)
  'sarvam-105b': { model: sarvam.chatModel('sarvam-105b'), providerOptions: { sarvam: { language_code: 'en-IN' } } },
  'sarvam-30b': { model: sarvam.chatModel('sarvam-30b'), providerOptions: { sarvam: { language_code: 'en-IN' } } },
} satisfies Record<string, RegistryEntry>;

export type ModelId = keyof typeof REGISTRY;

export type ModelEntry = RegistryEntry & { id: ModelId };

export const FALLBACK_MODEL_ID = 'sonnet-4.5' satisfies ModelId;

export const AVAILABLE_MODEL_IDS = Object.keys(REGISTRY) as ModelId[];

export const isValidModelId = (id: string): id is ModelId => id in REGISTRY;

export const getModel = (modelId?: string): ModelEntry => {
  const id: ModelId = modelId && isValidModelId(modelId) ? modelId : FALLBACK_MODEL_ID;
  if (modelId && !isValidModelId(modelId)) {
    logger.info(`Unknown model ID "${modelId}", falling back to ${FALLBACK_MODEL_ID}`);
  }
  return { id, ...REGISTRY[id] };
};
