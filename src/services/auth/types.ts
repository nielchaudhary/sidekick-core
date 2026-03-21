export enum IntegrationProvider {
  GOOGLE = 'GOOGLE',
  SLACK = 'SLACK',
  NOTION = 'NOTION',
}

export enum IntegrationStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  REVOKED = 'REVOKED',
  ERROR = 'ERROR',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  MAX = 'MAX',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  TRIAL = 'TRIAL',
}

export interface ISidekickUser {
  email: string; // Make required, need this for billing
  name: string;
  avatarUrl?: string;
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    paymentProvider: string; //dodo would be the default for now
    currentPeriodEnd?: Date;
  };
  ctime: Date;
  mtime: Date;
  // Usage tracking (for limits, analytics)
  usage: {
    memoriesCount: number;
    decisionsCount: number;
    queriesThisMonth: number;
    lastActiveAt: Date;
  };
}
