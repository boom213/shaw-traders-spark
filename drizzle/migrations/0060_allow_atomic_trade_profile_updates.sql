CREATE OR REPLACE FUNCTION public.guard_profile_trade_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'postgres' AND NOT public.is_staff(auth.uid()) THEN
    NEW.customer_type := OLD.customer_type;
    NEW.price_tier := OLD.price_tier;
    NEW.trade_approved_at := OLD.trade_approved_at;
    NEW.credit_limit := OLD.credit_limit;
    NEW.payment_terms_days := OLD.payment_terms_days;
    NEW.business_name := OLD.business_name;
  END IF;
  RETURN NEW;
END;
$$;