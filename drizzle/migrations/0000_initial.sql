-- Create enum for strategy types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'strategy_type') THEN
    CREATE TYPE strategy_type AS ENUM ('swing', 'intraday');
  END IF;
END$$;

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY,
  "open_id" varchar(64) NOT NULL,
  "name" text,
  "email" varchar(320),
  "role" varchar(32) NOT NULL DEFAULT 'user',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- Strategies table
CREATE TABLE IF NOT EXISTS "strategies" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "symbol" varchar(32) NOT NULL DEFAULT 'SPY',
  "type" strategy_type NOT NULL DEFAULT 'swing',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "strategies_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "strategies_user_idx" ON "strategies" ("user_id");

-- Trades table
CREATE TABLE IF NOT EXISTS "trades" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "strategy_id" integer NOT NULL,
  "symbol" varchar(24) NOT NULL,
  "side" varchar(16) NOT NULL,
  "quantity" numeric(18, 4) NOT NULL,
  "entry_price" numeric(18, 4) NOT NULL,
  "exit_price" numeric(18, 4) NOT NULL,
  "entry_time" timestamptz NOT NULL,
  "exit_time" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "trades_user_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "trades_strategy_fk" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "trades_user_idx" ON "trades" ("user_id");
CREATE INDEX IF NOT EXISTS "trades_strategy_idx" ON "trades" ("strategy_id");

-- Benchmarks table
CREATE TABLE IF NOT EXISTS "benchmarks" (
  "id" serial PRIMARY KEY,
  "date" varchar(16) NOT NULL,
  "close" numeric(18, 4) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "benchmarks_date_idx" ON "benchmarks" ("date");
