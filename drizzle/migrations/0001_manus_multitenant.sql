CREATE TABLE IF NOT EXISTS "workspaces" (
        "id" serial PRIMARY KEY NOT NULL,
        "external_id" varchar(128) NOT NULL,
        "name" varchar(255),
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_external_idx" ON "workspaces" USING btree ("external_id");
--> statement-breakpoint
INSERT INTO "workspaces" ("id", "external_id", "name")
SELECT 1, 'local-dev', 'Local development'
WHERE NOT EXISTS (SELECT 1 FROM "workspaces" WHERE "external_id" = 'local-dev');
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "workspace_id" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN IF NOT EXISTS "workspace_id" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "trades" ADD COLUMN IF NOT EXISTS "workspace_id" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "benchmarks" ADD COLUMN IF NOT EXISTS "workspace_id" integer NOT NULL DEFAULT 1;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategies_workspace_idx" ON "strategies" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trades_workspace_idx" ON "trades" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "benchmarks_workspace_idx" ON "benchmarks" USING btree ("workspace_id");
