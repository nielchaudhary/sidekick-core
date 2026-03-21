import { Logger } from '../../config/core/logger.ts';
import { SidekickCoreEnv } from '../../config/core/env.ts';
import { getErrorDetails, SidekickPlatformError } from '../../config/core/exceptions.ts';
import { getResend, waitlistEmailHtml } from './config.ts';

const logger = new Logger('mailer/waitlist-email');

export const sendSidekickWaitlistMail = async (email: string): Promise<void> => {
  const sender = SidekickCoreEnv.get('RESEND_SENDER_EMAIL');

  logger.info(`Sending waitlist email to ${email}`);

  try {
    const { data, error } = await getResend().emails.send({
      from: `Neel from Sidekick <${sender}>`,
      to: email,
      subject: "You're on the Sidekick Waitlist!",
      html: waitlistEmailHtml,
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
