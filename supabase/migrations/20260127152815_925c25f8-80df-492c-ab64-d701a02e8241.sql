-- =====================================================
-- FIX 1: Order Items - Restrict INSERT to order owners and collectors/admins
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert order items" ON public.order_items;

-- Create policy for buyers to add items only to their own pending orders
CREATE POLICY "Buyers can add items to their own pending orders"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.buyer_id = auth.uid()
      AND orders.status IN ('requested', 'invoice_sent')
    )
  );

-- Create policy for collectors/admins to manage order items
CREATE POLICY "Collectors and admins can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (is_admin_or_collector(auth.uid()));

-- =====================================================
-- FIX 2: Orders - Add input validation and tighten INSERT policy
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;

-- Create tighter policy ensuring buyer_id matches authenticated user
CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (buyer_id IS NULL OR buyer_id = auth.uid())
  );

-- Add CHECK constraints for input validation
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_email_format;
ALTER TABLE public.orders ADD CONSTRAINT orders_email_format 
  CHECK (buyer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_name_length;
ALTER TABLE public.orders ADD CONSTRAINT orders_name_length 
  CHECK (length(trim(buyer_name)) >= 2 AND length(buyer_name) <= 100);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_email_length;
ALTER TABLE public.orders ADD CONSTRAINT orders_email_length 
  CHECK (length(buyer_email) <= 255);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_phone_length;
ALTER TABLE public.orders ADD CONSTRAINT orders_phone_length 
  CHECK (buyer_phone IS NULL OR length(buyer_phone) <= 30);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_address_length;
ALTER TABLE public.orders ADD CONSTRAINT orders_address_length 
  CHECK (buyer_address IS NULL OR length(buyer_address) <= 500);

-- =====================================================
-- FIX 3: Profiles - Restrict SELECT to own profile + collectors/admins
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Collectors and admins can view all profiles (for order management)
CREATE POLICY "Collectors and admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (is_admin_or_collector(auth.uid()));

-- =====================================================
-- FIX 4: Order Status History - Tighten INSERT policy
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert status history" ON public.order_status_history;

-- Create policy for buyers to add status history only to their own orders
CREATE POLICY "Buyers can add status history to their own orders"
  ON public.order_status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_status_history.order_id 
      AND orders.buyer_id = auth.uid()
    )
  );

-- Create policy for collectors/admins to manage status history
CREATE POLICY "Collectors and admins can insert status history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (is_admin_or_collector(auth.uid()));