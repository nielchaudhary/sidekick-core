import OpenAI from 'openai';

import { SidekickCoreEnv } from '../config/env.ts';
import { Logger } from '../config/logger.ts';
import { type StreamHandlers } from './config.ts';
import { RoleTypes } from '../config/types.ts';

const logger = new Logger('openai');

export const openAIClient = new OpenAI({
  apiKey: SidekickCoreEnv.get('OPENAI_API_KEY'),
});

const buildInput = (prompt: string, systemPrompt?: string): OpenAI.Responses.ResponseInputItem[] => {
  const input: OpenAI.Responses.ResponseInputItem[] = [];

  if (systemPrompt) {
    input.push({
      role: RoleTypes.SYSTEM,
      content: systemPrompt,
    });
  }

  input.push({
    role: RoleTypes.USER,
    content: prompt,
  });

  return input;
};

const createStream = async (prompt: string, systemPrompt?: string) =>
  openAIClient.responses.create({
    model: 'gpt-5',
    input: buildInput(prompt, systemPrompt),
    stream: true,
  });

const isTextDelta = (event: any): boolean => event.type === 'response.output_text.delta' && !!event.delta;

const processStream = async (stream: AsyncIterable<any>, { onChunk }: StreamHandlers) => {
  for await (const event of stream) {
    if (isTextDelta(event)) {
      onChunk(event.delta);
    }
  }
};

export const streamTextUsingOpenAI = async (
  prompt: string,
  onChunk: (text: string) => void,
  systemPrompt?: string,
  _onStatus?: (status: string) => void
): Promise<void> => {
  try {
    const stream = await createStream(prompt, systemPrompt);

    await processStream(stream, { onChunk });
  } catch (error) {
    logger.error('OpenAI stream failed', error);
    throw error;
  }
};
