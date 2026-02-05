import { z } from 'zod';

export enum Occupation {
  STUDENT = 'student',
  FOUNDER = 'founder',
  ENGINEER = 'engineer',
  DESIGNER = 'designer',
  PRODUCT_MANAGER = 'product manager',
  MARKETER = 'marketer',
  SENIOR_LEADERSHIP = 'senior leadership',
  OTHER = 'other',
}

export interface IWaitlistDetails {
  name: string;
  email: string;
  occupation: Occupation;
}

//zod validation schema

export const waitlistRequestSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  occupation: z.string(),
});

export type IWaitlistReqSchema = z.infer<typeof waitlistRequestSchema>;
