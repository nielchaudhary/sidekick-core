import express, { type Router } from 'express';
import { streamTextPostHandler } from './api/streamTextPostHandler.ts';
import { generateTitlePostHandler } from './api/generateTitlePostHandler.ts';

const chatRouter = express.Router();

chatRouter.post('/', streamTextPostHandler);
chatRouter.post('/generate-title', generateTitlePostHandler);

export const chatRouterV1: [string, Router] = ['/v1/chat', chatRouter];
