-- A wholesaler's business name lived only on trade_applications, so Counter Sales
-- (which searches profiles) could never find them by the name they trade under.
-- Denormalise it onto the profile at approval time, for both the self-service and
-- the admin-created path.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name text;

CREATE INDEX IF NOT EXISTS profiles_business_name_idx ON public.profiles (business_name);

-- Existing approved wholesalers: copy from their most recent approved application.
UPDATE public.profiles p
SET business_name = latest.business_name
FROM (
  SELECT DISTINCT ON (profile_id) profile_id, business_name
  FROM public.trade_applications
  WHERE status = 'approved'
  ORDER BY profile_id, created_at DESC
) latest
WHERE p.id = latest.profile_id
  AND p.business_name IS NULL;

-- A customer may not rename their own approved business; only staff can.
CREATE OR REPLACE FUNCTION public.guard_profile_trade_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    NEW.customer_type := OLD.customer_type;
    NEW.price_tier := OLD.price_tier;
    NEW.trade_approved_at := OLD.trade_approved_at;
    NEW.credit_limit := OLD.credit_limit;
    NEW.payment_terms_days := OLD.payment_terms_days;
    NEW.business_name := OLD.business_name;
  END IF;
  RETURN NEW;
END; $$;