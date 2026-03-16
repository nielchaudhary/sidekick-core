import nodemailer from 'nodemailer';

import { Logger } from '../../config/logger.ts';
import { SidekickCoreEnv } from '../../config/env.ts';

export const SMTP_PORT = SidekickCoreEnv.get('SMTP_PORT');
export const SMTP_USERNAME = SidekickCoreEnv.get('SMTP_USERNAME');
export const SMTP_HOSTNAME = SidekickCoreEnv.get('SMTP_HOSTNAME');
export const SMTP_PASSWORD = SidekickCoreEnv.get('SMTP_PASSWORD');

const logger = new Logger('scheduler/config');

const transport = nodemailer.createTransport({
  host: SMTP_HOSTNAME,
  port: Number(SMTP_PORT),
  auth: { user: SMTP_USERNAME, pass: SMTP_PASSWORD },
} as nodemailer.TransportOptions);

export const sendSidekickWaitlistMail = async (email: string, name: string) => {
  try {
    await transport.sendMail({
      from: 'Sidekick Team <neilchaudhary12.work@gmail.com>',
      to: email,
      subject: "You're on the Sidekick Waitlist!",
      html: `
        <h2>Welcome to the Sidekick Waitlist, ${name}!</h2>
        <p>Thanks for signing up. We'll notify you as soon as your spot is ready.</p>
        <p>Stay tuned!</p>
        <p>— The Sidekick Team</p>
      `,
    });
  } catch (err) {
    logger.error('Failed to send waitlist email:', err);
  }
};
