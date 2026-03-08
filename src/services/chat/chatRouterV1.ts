import express, { type Router } from 'express';
import { streamTextPostHandler } from './api/streamTextPostHandler.ts';

const chatRouter = express.Router();

chatRouter.post('/', streamTextPostHandler);

export const chatRouterV1: [string, Router] = ['/v1/chat', chatRouter];
