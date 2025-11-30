CREATE TYPE "upload_status" AS ENUM ('pending', 'success', 'partial', 'failed');
CREATE TYPE "upload_type" AS ENUM ('trades', 'benchmarks', 'equity');

CREATE TABLE IF NOT EXISTS "upload_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "workspace_id" integer NOT NULL DEFAULT 1,
    "file_name" varchar(255) NOT NULL,
    "upload_type" "upload_type" NOT NULL DEFAULT 'trades',
    "row_count_total" integer DEFAULT 0 NOT NULL,
    "row_count_imported" integer DEFAULT 0 NOT NULL,
    "row_count_failed" integer DEFAULT 0 NOT NULL,
    "status" "upload_status" NOT NULL DEFAULT 'pending',
    "started_at" timestamp with time zone DEFAULT now() NOT NULL,
    "finished_at" timestamp with time zone,
    "error_summary" text,
    "warnings_summary" text
);

CREATE INDEX IF NOT EXISTS "upload_logs_user_idx" ON "upload_logs" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "upload_logs_workspace_idx" ON "upload_logs" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "upload_logs_started_idx" ON "upload_logs" USING btree ("started_at");
