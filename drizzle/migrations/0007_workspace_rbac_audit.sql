-- Workspace ownership support
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS owner_user_id integer;
CREATE INDEX IF NOT EXISTS workspaces_owner_idx ON workspaces (owner_user_id);
-- Backfill note: set owner_user_id to the appropriate user for each workspace before enforcing owner-only writes.

-- Workspace membership roles
CREATE TABLE IF NOT EXISTS workspace_members (
    id serial PRIMARY KEY,
    workspace_id integer NOT NULL,
    user_id integer NOT NULL,
    role varchar(32) NOT NULL DEFAULT 'viewer',
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_idx ON workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_idx ON workspace_members (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_members_workspace_user_idx ON workspace_members (workspace_id, user_id);

-- Audit logging for user actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id serial PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id integer NOT NULL,
    workspace_id integer NOT NULL,
    action varchar(128) NOT NULL,
    entity_type varchar(128) NOT NULL,
    entity_id varchar(128),
    summary text
);
CREATE INDEX IF NOT EXISTS audit_logs_workspace_time_idx ON audit_logs (workspace_id, created_at);
