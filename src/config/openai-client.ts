import OpenAI from 'openai';
import { SidekickCoreEnv } from './env.ts';
import { Logger } from './logger.ts';

const OPENAI_API_KEY = SidekickCoreEnv.get('OPENAI_API_KEY');
const logger = new Logger('openai-client');

export const openAIClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export enum OpenAIModel {
  GPT4o = 'gpt-4o',
  GPT4oMini = 'gpt-4o-mini',
  GPT4_1 = 'gpt-4.1',
  GPT4_1Mini = 'gpt-4.1-mini',
  GPT4_1Nano = 'gpt-4.1-nano',
  O1 = 'o1',
  O1Mini = 'o1-mini',
  O1Pro = 'o1-pro',
  O3 = 'o3',
  O3Mini = 'o3-mini',
  O4Mini = 'o4-mini',
}

export enum OpenAIStreamEvent {
  ResponseCreated = 'response.created',
  ResponseInProgress = 'response.in_progress',
  ResponseCompleted = 'response.completed',
  ResponseFailed = 'response.failed',
  ResponseIncomplete = 'response.incomplete',
  OutputItemAdded = 'response.output_item.added',
  OutputItemDone = 'response.output_item.done',
  ContentPartAdded = 'response.content_part.added',
  ContentPartDone = 'response.content_part.done',
  OutputTextDelta = 'response.output_text.delta',
  OutputTextDone = 'response.output_text.done',
  RefusalDelta = 'response.refusal.delta',
  RefusalDone = 'response.refusal.done',
  FunctionCallArgsDelta = 'response.function_call_arguments.delta',
  FunctionCallArgsDone = 'response.function_call_arguments.done',
}

export enum OpenAIRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
}

export const streamTextUsingOpenAI = async (
  prompt: string,
  model: OpenAIModel = OpenAIModel.GPT4oMini
): Promise<string> => {
  try {
    const stream = await openAIClient.responses.create({
      model,
      input: [{ role: OpenAIRole.User, content: prompt }],
      stream: true,
    });

    let result = '';
    for await (const event of stream) {
      logger.info('Stream event:', event);
      if (event.type === OpenAIStreamEvent.OutputTextDelta && event.delta) {
        result += event.delta;
      }
    }

    return result;
  } catch (error) {
    logger.error('Stream failed:', error);
    throw error;
  }
};
