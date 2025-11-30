ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "upload_id" integer;
CREATE INDEX IF NOT EXISTS "trades_upload_idx" ON "trades" USING btree ("upload_id");

ALTER TABLE "benchmarks" ADD COLUMN IF NOT EXISTS "upload_id" integer;
CREATE INDEX IF NOT EXISTS "benchmarks_upload_idx" ON "benchmarks" USING btree ("upload_id");
