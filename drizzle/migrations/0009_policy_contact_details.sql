ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS grievance_officer_name text,
  ADD COLUMN IF NOT EXISTS grievance_officer_email text,
  ADD COLUMN IF NOT EXISTS grievance_officer_phone text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS policy_updated_at date;

UPDATE public.shop_settings
SET policy_updated_at = COALESCE(policy_updated_at, CURRENT_DATE)
WHERE id = true;