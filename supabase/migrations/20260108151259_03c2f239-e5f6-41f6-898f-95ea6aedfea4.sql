-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'collector', 'buyer');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (secure role storage)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create seeds table
CREATE TABLE public.seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  image_url TEXT,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  country TEXT,
  city TEXT,
  zip_code TEXT,
  street TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create deleted_seeds table (recycle bin)
CREATE TABLE public.deleted_seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  seed_id TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  latitude DECIMAL(10, 6),
  longitude DECIMAL(10, 6),
  country TEXT,
  city TEXT,
  zip_code TEXT,
  street TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  added_by UUID,
  original_created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days')
);

-- Create seed_history table (audit trail)
CREATE TABLE public.seed_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id UUID,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'restored')),
  changes JSONB,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seed_history ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is admin or collector
CREATE OR REPLACE FUNCTION public.is_admin_or_collector(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'collector')
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can modify, users can view their own)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seeds policies
CREATE POLICY "Anyone authenticated can view seeds"
  ON public.seeds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Collectors and admins can insert seeds"
  ON public.seeds FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_collector(auth.uid()));

CREATE POLICY "Collectors and admins can update seeds"
  ON public.seeds FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_collector(auth.uid()));

CREATE POLICY "Collectors and admins can delete seeds"
  ON public.seeds FOR DELETE
  TO authenticated
  USING (public.is_admin_or_collector(auth.uid()));

-- Deleted seeds policies
CREATE POLICY "Collectors and admins can view deleted seeds"
  ON public.deleted_seeds FOR SELECT
  TO authenticated
  USING (public.is_admin_or_collector(auth.uid()));

CREATE POLICY "Collectors and admins can insert into deleted seeds"
  ON public.deleted_seeds FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_collector(auth.uid()));

CREATE POLICY "Collectors and admins can delete from bin"
  ON public.deleted_seeds FOR DELETE
  TO authenticated
  USING (public.is_admin_or_collector(auth.uid()));

-- Seed history policies
CREATE POLICY "Collectors and admins can view history"
  ON public.seed_history FOR SELECT
  TO authenticated
  USING (public.is_admin_or_collector(auth.uid()));

CREATE POLICY "System can insert history"
  ON public.seed_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seeds_updated_at
  BEFORE UPDATE ON public.seeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to assign role on signup (called from edge function)
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id UUID, _role app_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Create storage bucket for seed images
INSERT INTO storage.buckets (id, name, public)
VALUES ('seed-images', 'seed-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for seed images
CREATE POLICY "Anyone can view seed images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'seed-images');

CREATE POLICY "Authenticated users can upload seed images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'seed-images');

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'seed-images');

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'seed-images');