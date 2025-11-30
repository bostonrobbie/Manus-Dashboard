-- Add external_id and natural_key columns for trade de-duplication
ALTER TABLE trades ADD COLUMN IF NOT EXISTS external_id varchar(128);
ALTER TABLE trades ADD COLUMN IF NOT EXISTS natural_key varchar(512);

-- Unique constraints scoped by workspace
CREATE UNIQUE INDEX IF NOT EXISTS trades_workspace_external_unique ON trades (workspace_id, external_id);
CREATE UNIQUE INDEX IF NOT EXISTS trades_workspace_natural_key_unique ON trades (workspace_id, natural_key);
