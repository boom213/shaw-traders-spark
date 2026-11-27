REVOKE EXECUTE ON FUNCTION public.best_sellers(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.best_sellers(integer, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, text, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, text, text, numeric, text) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_profile_trade_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF current_user <> 'postgres' AND NOT public.is_staff(auth.uid()) THEN
    IF TG_OP = 'INSERT' THEN
      NEW.customer_type := 'retail';
      NEW.price_tier := 'retail';
      NEW.trade_approved_at := NULL;
      NEW.credit_limit := 0;
      NEW.payment_terms_days := 0;
      NEW.business_name := NULL;
    ELSE
      NEW.customer_type := OLD.customer_type;
      NEW.price_tier := OLD.price_tier;
      NEW.trade_approved_at := OLD.trade_approved_at;
      NEW.credit_limit := OLD.credit_limit;
      NEW.payment_terms_days := OLD.payment_terms_days;
      NEW.business_name := OLD.business_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
DROP TRIGGER IF EXISTS profiles_guard_trade_fields ON public.profiles;
CREATE TRIGGER profiles_guard_trade_fields BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_trade_fields();

DROP POLICY IF EXISTS "Staff can read suppliers" ON public.suppliers;
CREATE POLICY "Managers can read suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (public.staff_role(auth.uid()) IN ('super_admin','owner','manager'));
DROP POLICY IF EXISTS "Staff can read supplier ledger" ON public.supplier_ledger;
CREATE POLICY "Managers can read supplier ledger" ON public.supplier_ledger FOR SELECT TO authenticated
  USING (public.staff_role(auth.uid()) IN ('super_admin','owner','manager'));

DROP POLICY IF EXISTS "Staff write shop settings" ON public.shop_settings;
CREATE POLICY "Owners write shop settings" ON public.shop_settings FOR ALL TO authenticated
  USING (public.staff_role(auth.uid()) IN ('super_admin','owner'))
  WITH CHECK (public.staff_role(auth.uid()) IN ('super_admin','owner'));