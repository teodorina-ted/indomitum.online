-- Fix: Restrict seed-images bucket uploads to collectors/admins only
DROP POLICY IF EXISTS "Authenticated users can upload seed images" ON storage.objects;
CREATE POLICY "Only collectors and admins can upload seed images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'seed-images' AND
    public.is_admin_or_collector(auth.uid())
  );

-- Fix: Restrict order creation to authenticated role only (not public)
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Authenticated users can create their own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND buyer_id = auth.uid());