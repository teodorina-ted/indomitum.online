-- Fix 1: Storage policies - restrict UPDATE/DELETE to collectors/admins only
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

CREATE POLICY "Collectors can update seed images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'seed-images' AND
    public.is_admin_or_collector(auth.uid())
  );

CREATE POLICY "Collectors can delete seed images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'seed-images' AND
    public.is_admin_or_collector(auth.uid())
  );

-- Fix 2: Secure the assign_user_role function to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.assign_user_role(_user_id UUID, _role app_role)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow setting role for yourself
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Cannot assign roles to other users';
  END IF;
  
  -- Check if user already has a role (prevent privilege escalation)
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'User already has a role assigned';
  END IF;
  
  -- Only allow buyer or collector roles for self-signup (admin must be assigned by existing admin)
  IF _role = 'admin' THEN
    RAISE EXCEPTION 'Admin role cannot be self-assigned';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role);
END;
$$;