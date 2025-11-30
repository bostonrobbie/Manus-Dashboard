ALTER TABLE "benchmarks" ADD COLUMN IF NOT EXISTS "symbol" varchar(64) NOT NULL DEFAULT 'SPY';
ALTER TABLE "benchmarks" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "benchmarks_symbol_idx" ON "benchmarks" USING btree ("symbol");
CREATE INDEX IF NOT EXISTS "benchmarks_deleted_idx" ON "benchmarks" USING btree ("deleted_at");

ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "trades_deleted_idx" ON "trades" USING btree ("deleted_at");
