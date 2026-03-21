export enum IntegrationProvider {
  GOOGLE = 'google',
  SLACK = 'slack',
  NOTION = 'notion',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  REVOKED = 'revoked',
}

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  MAX = 'max',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  TRIAL = 'trial',
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
