import { Resend } from 'resend';
import { Logger } from '../../config/core/logger.ts';
import { SidekickCoreEnv } from '../../config/core/env.ts';
import { getErrorDetails, SidekickPlatformError } from '../../config/core/exceptions.ts';

const logger = new Logger('mailer/config');

let resend: Resend | null = null;

const getResend = (): Resend => {
  if (!resend) {
    resend = new Resend(SidekickCoreEnv.get('RESEND_API_KEY'));
  }
  return resend;
};

export const sendSidekickWaitlistMail = async (email: string): Promise<void> => {
  const sender = SidekickCoreEnv.get('RESEND_SENDER_EMAIL');

  try {
    const { data, error } = await getResend().emails.send({
      from: `Neel from Sidekick <${sender}>`,
      to: email,
      subject: "You're on the Sidekick Waitlist!",
      template: { id: 'waitlist' },
    });

    if (error) {
      logger.error('Resend API error:', error);
      throw SidekickPlatformError.internal('Failed to send waitlist email');
    }

    logger.info(`Waitlist email sent successfully (id: ${data?.id})`);
  } catch (err) {
    logger.error('Failed to send waitlist email:', getErrorDetails(err));
    throw err instanceof SidekickPlatformError ? err : SidekickPlatformError.internal('Failed to send waitlist email');
  }
};
