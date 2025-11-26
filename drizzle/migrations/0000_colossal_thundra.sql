DO $$ BEGIN
 CREATE TYPE "public"."strategy_type" AS ENUM('swing', 'intraday');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(16) NOT NULL,
	"close" numeric(18, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"symbol" varchar(32) DEFAULT 'SPY' NOT NULL,
	"type" "strategy_type" DEFAULT 'swing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"strategy_id" integer NOT NULL,
	"symbol" varchar(24) NOT NULL,
	"side" varchar(16) NOT NULL,
	"quantity" numeric(18, 4) NOT NULL,
	"entry_price" numeric(18, 4) NOT NULL,
	"exit_price" numeric(18, 4) NOT NULL,
	"entry_time" timestamp with time zone NOT NULL,
	"exit_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"role" varchar(32) DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benchmarks_date_idx" ON "benchmarks" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategies_user_idx" ON "strategies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_user_idx" ON "trades" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_strategy_idx" ON "trades" USING btree ("strategy_id");