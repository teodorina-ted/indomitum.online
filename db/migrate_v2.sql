-- Migration v2: organizations, tracking_code, collector_id fix, buyer_seeds uniqueness
-- Run this if you already have a running database from v1

BEGIN;

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add organization_id to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 3. Add organization_id to seeds
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 4. Add organization_id to deleted_seeds
ALTER TABLE deleted_seeds ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 5. Add tracking fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 6. Add tracking_code to order_status_history
ALTER TABLE order_status_history ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- 7. Add UNIQUE constraint to buyer_seeds (prevent duplicate favourites)
ALTER TABLE buyer_seeds ADD CONSTRAINT IF NOT EXISTS buyer_seeds_buyer_seed_unique UNIQUE (buyer_id, seed_id);

-- 8. Remove FK on seed_history.seed_id so history survives hard deletes
-- (Only needed if constraint exists - safe to ignore error if not)
ALTER TABLE seed_history DROP CONSTRAINT IF EXISTS seed_history_seed_id_fkey;

-- 9. Helper function for org lookup
CREATE OR REPLACE FUNCTION get_org(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT organization_id FROM users WHERE id = _user_id;
$$;

COMMIT;
