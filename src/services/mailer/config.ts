import { Resend } from 'resend';
import { SidekickCoreEnv } from '../../config/core/env.ts';

let resend: Resend | null = null;

export const getResend = (): Resend => {
  if (!resend) {
    resend = new Resend(SidekickCoreEnv.get('RESEND_API_KEY'));
  }
  return resend;
};

export const waitlistEmailHtml = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 480px; line-height: 1.7; font-size: 14px;">
      <p>Hey there,</p>
      <br/>
<p>You're in. Welcome to the <a href="https://usesidekick.xyz" style="color: #B34B71; text-decoration: none;">Sidekick</a> waitlist.</p>      <br/>
     <p>We're building Sidekick to help you make quicker, smarter decisions using your own context. You just locked in your spot.</p>
      <br/>
      <p><b>What happens next</b></p>
    <p>We're letting people in slowly, each batch helps us collect feedback and make Sidekick sharper before the next one gets in. When your turn comes, you'll get a personal invite straight to your inbox. From there, the more you use Sidekick, the better it gets. It picks up on your context, adapts to how you think, and starts catching things you'd miss.</p>
      <br/>
      <p style="color: #666;">Appreciate you being early.</p>
      <p style="color: #666;">— Neel</p>
      <br/>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;"/>
      <p style="font-size: 12px; color: #999;">Got feature ideas or feedback? Reach out to me on my <a href="mailto:neilchaudhary12.work@gmail.com" style="color: #B34B71; text-decoration: none;">personal email</a></p>
    </div>
  `;
