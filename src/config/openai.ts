import OpenAI from 'openai';
import { Env } from './env.ts';
import { Logger } from './logger.ts';

const OPENAI_API_KEY = Env.get('OPENAI_API_KEY');

const logger = new Logger('openai');
export const openAIClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

logger.info(`Inside OpenAI client`);

// export const transcribeAudio = async (audioUrl: string) => {
//   try {
//     // Download audio using superagent
//     // use openai / groq for transcription
//   } catch (error) {
//     logger.error('Transcription failed:', error);
//     throw error;
//   }
// };
