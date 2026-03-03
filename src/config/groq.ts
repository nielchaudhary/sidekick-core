import fs from 'fs';
import Groq from 'groq-sdk';
import { Env } from './env.ts';
import { Logger } from './logger.ts';

const logger = new Logger('groq');
const groq = new Groq({ apiKey: Env.get('GROQ_API_KEY') });

export const transcribeTextWithGroq = async (audioUrl: string) => {
  //download audio - convert to m4a - check for file size - split file size - transcribe

  logger.info(`Transcribing Audio for ${audioUrl} using Groq`);

  try {
    const groqTranscription = await groq.audio.transcriptions.create({
      file: fs.createReadStream('audio.m4a'),
      model: 'whisper-large-v3',
      temperature: 0,
      response_format: 'verbose_json',
    });

    return groqTranscription.text;
  } catch (error) {
    logger.error(error);
    throw error;
  }
};
