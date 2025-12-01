DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE "user_role" AS ENUM ('OWNER', 'ADMIN', 'USER', 'VIEWER');
  END IF;
END $$;

-- Normalize existing user rows before applying constraints
UPDATE users
SET email = COALESCE(NULLIF(email, ''), CONCAT('user-', id, '@local.invalid'))
WHERE email IS NULL OR email = '';

UPDATE users
SET role = COALESCE(NULLIF(UPPER(role), ''), 'USER')
WHERE role IS NULL OR role = '' OR UPPER(role) NOT IN ('OWNER', 'ADMIN', 'USER', 'VIEWER');

ALTER TABLE users
  ALTER COLUMN role TYPE user_role USING UPPER(role)::user_role,
  ALTER COLUMN role SET DEFAULT 'USER';

ALTER TABLE users
  ALTER COLUMN email SET NOT NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider varchar(64) DEFAULT 'manus',
  ADD COLUMN IF NOT EXISTS auth_provider_id varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
CREATE INDEX IF NOT EXISTS users_provider_idx ON users(auth_provider, auth_provider_id);

DO $$
DECLARE
  v_owner_id integer;
BEGIN
  SELECT id INTO v_owner_id FROM users WHERE role = 'OWNER' LIMIT 1;
  IF v_owner_id IS NULL THEN
    INSERT INTO users (open_id, email, role, workspace_id, name, auth_provider)
    VALUES ('system-owner', 'owner@local.invalid', 'OWNER', 1, 'System Owner', 'system')
    RETURNING id INTO v_owner_id;
  END IF;

  ALTER TABLE strategies ADD COLUMN IF NOT EXISTS owner_id integer;
  UPDATE strategies SET owner_id = COALESCE(owner_id, user_id, v_owner_id) WHERE owner_id IS NULL;
  ALTER TABLE strategies ALTER COLUMN owner_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS strategies_owner_idx ON strategies(owner_id);

  ALTER TABLE trades ADD COLUMN IF NOT EXISTS owner_id integer;
  UPDATE trades SET owner_id = COALESCE(owner_id, user_id, v_owner_id) WHERE owner_id IS NULL;
  ALTER TABLE trades ALTER COLUMN owner_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS trades_owner_idx ON trades(owner_id);

  ALTER TABLE benchmarks ADD COLUMN IF NOT EXISTS owner_id integer;
  UPDATE benchmarks SET owner_id = COALESCE(owner_id, v_owner_id) WHERE owner_id IS NULL;
  ALTER TABLE benchmarks ALTER COLUMN owner_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS benchmarks_owner_idx ON benchmarks(owner_id);

  ALTER TABLE upload_logs ADD COLUMN IF NOT EXISTS owner_id integer;
  UPDATE upload_logs SET owner_id = COALESCE(owner_id, user_id, v_owner_id) WHERE owner_id IS NULL;
  ALTER TABLE upload_logs ALTER COLUMN owner_id SET NOT NULL;
  CREATE INDEX IF NOT EXISTS upload_logs_owner_idx ON upload_logs(owner_id);
END $$;
