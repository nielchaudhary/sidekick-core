import nodemailer from 'nodemailer';
import { sidekickWaitlistMailHtml } from './sidekickWaitlistMail.ts';
import { Logger } from '../../config/core/logger.ts';
import { SidekickCoreEnv } from '../../config/core/env.ts';

const logger = new Logger('mailer/config');

let transport: nodemailer.Transporter | null = null;

const getTransport = (): nodemailer.Transporter => {
  if (!transport) {
    const host = SidekickCoreEnv.get('SMTP_HOSTNAME');
    const port = Number(SidekickCoreEnv.get('SMTP_PORT'));

    transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: SidekickCoreEnv.get('SMTP_USERNAME'), pass: SidekickCoreEnv.get('SMTP_PASSWORD') },
    });
  }
  return transport;
};

export const sendSidekickWaitlistMail = async (email: string): Promise<void> => {
  const sender = SidekickCoreEnv.get('SMTP_FROM_ADDRESS');

  await getTransport().sendMail({
    from: sender,
    to: email,
    subject: "You're on the Sidekick Waitlist!",
    html: sidekickWaitlistMailHtml,
  });

  logger.info('Waitlist email sent successfully');
};
