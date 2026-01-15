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

export enum SyncFrequency {
  REALTIME = 'REALTIME', // Webhook-based - check implementation if possible
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  MANUAL = 'MANUAL',
}

export enum MemorySource {
  MANUAL = 'MANUAL',
  NOTION = 'NOTION',
  GOOGLE_DOC = 'GOOGLE_DOC',
  GOOGLE_MAIL = 'GOOGLE_MAIL',
  SLACK = 'SLACK',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  TRIAL = 'TRIAL',
}

export interface ISidekickUser {
  clerkId: string; // External auth reference
  email: string; // Make required, need this for billing
  name: string;
  avatarUrl?: string;
  preferences: IUserPreferences;
  integrations: IUserIntegration[];
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    stripeCustomerId?: string;
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

export interface IUserPreferences {
  timezone?: string; // For scheduling, display
  defaultMemorySource?: MemorySource; // Where manual captures default to
  weeklyDigest: boolean; // Email preferences
  autoSuggestDecisions: boolean; // UX preference
}

export interface IUserIntegration {
  provider: IntegrationProvider;
  status: IntegrationStatus;
  connectedAt: Date;
  lastSyncAt?: Date;
  syncEnabled: boolean;
  settings: IntegrationSettings; // Provider-specific config
}

export type IntegrationSettings =
  | NotionIntegrationSettings
  | GoogleIntegrationSettings
  | SlackIntegrationSettings;

export interface NotionIntegrationSettings {
  provider: IntegrationProvider.NOTION;
  selectedDatabases?: string[]; // Which Notion DBs to sync
  selectedPages?: string[]; // Specific pages to sync
  syncFrequency: SyncFrequency;
}

export interface GoogleIntegrationSettings {
  provider: IntegrationProvider.GOOGLE;
  syncDrive: boolean;
  syncCalendar: boolean;
  syncMail: boolean;
  drivefolders?: string[];
  mailLabels?: string[];
}

export interface SlackIntegrationSettings {
  provider: IntegrationProvider.SLACK;
  selectedChannels?: string[];
  syncDMs: boolean;
}
