import { pgTable, serial, uuid, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'pro', 'max']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'trial']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id').defaultRandom().notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatar_url: text('avatar_url'),

  //subscription deets
  subscription_tier: subscriptionTierEnum('subscription_tier').default('free').notNull(),
  subscription_status: subscriptionStatusEnum('subscription_status').default('trial').notNull(),
  payment_provider: text('payment_provider').default('dodo').notNull(),
  current_period_end: timestamp('current_period_end'),

  //user meta
  memories_count: integer('memories_count').default(0).notNull(),
  decisions_count: integer('decisions_count').default(0).notNull(),
  lifetime_query_executed: integer('lifetime_query_executed').default(0).notNull(),
  last_active_at: timestamp('last_active_at').defaultNow(),
  ctime: timestamp('ctime').defaultNow().notNull(),
  mtime: timestamp('mtime').defaultNow().notNull(),
});

export type fetchSidekickUser = InferSelectModel<typeof users>;
export type createSidekickUser = InferInsertModel<typeof users>;
