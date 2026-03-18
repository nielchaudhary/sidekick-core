import { z } from 'zod';

export enum Occupation {
  FOUNDER_CEO = 'Founder/CEO',
  PRODUCT = 'Product (PM/APM)',
  ENGINEERING = 'Engineering',
  DESIGN = 'Design',
  OPS_STRATEGY = 'Ops/Strategy',
  GTM_GROWTH = 'GTM/Growth',
  INVESTING = 'Investing (VC/PE)',
  OTHER = 'Other',
}

export interface IWaitlistDetails {
  email: string;
  occupation: Occupation;
  userId: string;
}

//zod validation schema

export const waitlistRequestSchema = z.object({
  email: z.string().email(),
  occupation: z.string(),
});

export type IWaitlistReqSchema = z.infer<typeof waitlistRequestSchema>;
