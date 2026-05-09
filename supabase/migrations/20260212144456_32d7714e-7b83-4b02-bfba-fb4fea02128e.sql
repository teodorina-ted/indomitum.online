
-- Fix profiles SELECT policies: restrict to authenticated users only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Collectors and admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Collectors and admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_admin_or_collector(auth.uid()));

-- Fix orders SELECT policies: restrict to authenticated users only
DROP POLICY IF EXISTS "Buyers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Collectors and admins can view all orders" ON public.orders;

CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id);

CREATE POLICY "Collectors and admins can view all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (is_admin_or_collector(auth.uid()));
