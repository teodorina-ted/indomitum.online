-- Table to track seeds assigned/sold to buyers
CREATE TABLE public.buyer_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seed_id uuid NOT NULL REFERENCES public.seeds(id) ON DELETE CASCADE,
  assigned_by uuid,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  UNIQUE(buyer_id, seed_id)
);

-- Enable RLS
ALTER TABLE public.buyer_seeds ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own purchased seeds
CREATE POLICY "Buyers can view their own seeds"
ON public.buyer_seeds
FOR SELECT
USING (auth.uid() = buyer_id);

-- Collectors/Admins can view all buyer seeds
CREATE POLICY "Collectors and admins can view all buyer seeds"
ON public.buyer_seeds
FOR SELECT
USING (is_admin_or_collector(auth.uid()));

-- Collectors/Admins can assign seeds to buyers
CREATE POLICY "Collectors and admins can assign seeds"
ON public.buyer_seeds
FOR INSERT
WITH CHECK (is_admin_or_collector(auth.uid()));

-- Collectors/Admins can update assignments
CREATE POLICY "Collectors and admins can update assignments"
ON public.buyer_seeds
FOR UPDATE
USING (is_admin_or_collector(auth.uid()));

-- Collectors/Admins can delete assignments
CREATE POLICY "Collectors and admins can delete assignments"
ON public.buyer_seeds
FOR DELETE
USING (is_admin_or_collector(auth.uid()));