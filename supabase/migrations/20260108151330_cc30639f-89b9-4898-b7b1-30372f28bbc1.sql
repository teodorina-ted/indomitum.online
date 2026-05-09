-- Fix function search path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop and recreate the permissive seed_history insert policy with proper check
DROP POLICY IF EXISTS "System can insert history" ON public.seed_history;

CREATE POLICY "Authenticated users can insert history"
  ON public.seed_history FOR INSERT
  TO authenticated
  WITH CHECK (performed_by = auth.uid());