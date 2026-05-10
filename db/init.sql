-- Indomitum Database Schema v2
-- Fixes: organizations/teams, tracking_code on orders, collector_id assignment,
--        seed ownership scoping, buyer_seeds uniqueness + persisted in DB

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE app_role AS ENUM ('admin', 'collector', 'buyer');
CREATE TYPE delivery_method AS ENUM ('pickup', 'shipping');
CREATE TYPE order_status AS ENUM (
  'requested', 'invoice_sent', 'confirmed', 'preparing',
  'shipped', 'ready_pickup', 'delivered', 'completed', 'cancelled'
);

-- Organizations (multi-user collector teams)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Seeds
CREATE TABLE seeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seed_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INT DEFAULT 0,
  notes TEXT,
  image_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  street TEXT,
  city TEXT,
  country TEXT,
  zip_code TEXT,
  added_by UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed history (no FK on seed_id so history survives hard deletes)
CREATE TABLE seed_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seed_id UUID,
  action TEXT NOT NULL,
  changes JSONB,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Deleted seeds (recycle bin)
CREATE TABLE deleted_seeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_id UUID NOT NULL,
  seed_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INT DEFAULT 0,
  notes TEXT,
  image_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  street TEXT,
  city TEXT,
  country TEXT,
  zip_code TEXT,
  added_by UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  original_created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ DEFAULT now(),
  deleted_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Buyer seeds (persisted in DB, not localStorage)
CREATE TABLE buyer_seeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES users(id) NOT NULL,
  seed_id UUID REFERENCES seeds(id) ON DELETE CASCADE NOT NULL,
  quantity INT DEFAULT 1,
  notes TEXT,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(buyer_id, seed_id)
);

-- Orders (with tracking_code, collector_id, organization_id)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES users(id),
  collector_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  buyer_phone TEXT,
  buyer_address TEXT,
  status order_status DEFAULT 'requested',
  delivery_method delivery_method,
  notes TEXT,
  collector_notes TEXT,
  invoice_amount NUMERIC,
  invoice_details TEXT,
  tracking_code TEXT,
  tracking_url TEXT,
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  seed_id UUID REFERENCES seeds(id) NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order status history
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  status order_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  notes TEXT,
  tracking_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Helper: check role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Helper: get user org
CREATE OR REPLACE FUNCTION get_org(_user_id UUID)
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT organization_id FROM users WHERE id = _user_id;
$$;
