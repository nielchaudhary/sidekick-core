import express, { type Router } from 'express';
import { addUserToWaitlistPostHandler } from './api/addUserToWaitlistPostHandler.ts';

const waitlistrouter = express.Router();

waitlistrouter.post('/add', addUserToWaitlistPostHandler);

export const waitlistRouter: [string, Router] = ['/waitlist', waitlistrouter];
