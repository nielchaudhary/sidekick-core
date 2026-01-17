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
  companySize?: 'solo' | '1-10' | '11-50' | '51-200' | '200+';
  primaryUseCase?: string;
}
