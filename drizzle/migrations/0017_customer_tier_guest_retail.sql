CREATE OR REPLACE FUNCTION public.customer_tier(_user_id uuid)
RETURNS public.price_tier
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT CASE
              WHEN p.customer_type = 'trade' AND p.trade_approved_at IS NOT NULL THEN p.price_tier
              ELSE 'retail'::public.price_tier
            END
     FROM public.profiles p
     WHERE p.id = _user_id),
    'retail'::public.price_tier
  );
$$;