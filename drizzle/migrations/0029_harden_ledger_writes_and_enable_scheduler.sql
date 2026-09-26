DROP POLICY IF EXISTS "Staff write ledger" ON public.trade_ledger;

CREATE POLICY "Managers read ledger" ON public.trade_ledger
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.staff_role(auth.uid()) IN ('manager'::public.staff_role, 'owner'::public.staff_role, 'super_admin'::public.staff_role));

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;