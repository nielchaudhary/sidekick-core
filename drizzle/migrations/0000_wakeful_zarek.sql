CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'trial');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'pro', 'max');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL,
	"payment_provider" text DEFAULT 'dodo' NOT NULL,
	"current_period_end" timestamp,
	"memories_count" integer DEFAULT 0 NOT NULL,
	"decisions_count" integer DEFAULT 0 NOT NULL,
	"lifetime_query_executed" integer DEFAULT 0 NOT NULL,
	"last_active_at" timestamp DEFAULT now(),
	"ctime" timestamp DEFAULT now() NOT NULL,
	"mtime" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
