CREATE TYPE public.supplier_entry_kind AS ENUM ('bill', 'payment', 'adjustment');
CREATE TYPE public.supplier_pay_method AS ENUM ('cash', 'upi', 'bank_transfer', 'cheque', 'other');
CREATE TYPE public.supplier_category AS ENUM ('stock_gst', 'stock_no_gst', 'expense', 'transport', 'advance', 'drawings', 'other');

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  gstin text,
  address text,
  note text,
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  payment_terms_days integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppliers_name_nonempty CHECK (length(trim(name)) >= 1),
  CONSTRAINT suppliers_payment_terms_nonnegative CHECK (payment_terms_days >= 0)
);
GRANT SELECT ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read suppliers" ON public.suppliers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX suppliers_active_name_idx ON public.suppliers(active, name);
CREATE TRIGGER suppliers_touch_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.supplier_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  kind public.supplier_entry_kind NOT NULL,
  amount numeric(12,2) NOT NULL,
  category public.supplier_category NOT NULL DEFAULT 'other',
  method public.supplier_pay_method,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  bill_number text,
  reference text,
  note text,
  settled boolean NOT NULL DEFAULT false,
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  created_by uuid,
  created_by_name text,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_ledger_positive_nonadjustment CHECK (kind = 'adjustment' OR amount > 0),
  CONSTRAINT supplier_ledger_amount_nonzero CHECK (amount <> 0)
);
GRANT SELECT ON public.supplier_ledger TO authenticated;
GRANT ALL ON public.supplier_ledger TO service_role;
ALTER TABLE public.supplier_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read supplier ledger" ON public.supplier_ledger FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX supplier_ledger_supplier_date_idx ON public.supplier_ledger(supplier_id, entry_date DESC, created_at DESC);
CREATE INDEX supplier_ledger_date_idx ON public.supplier_ledger(entry_date DESC, created_at DESC);
CREATE INDEX supplier_ledger_kind_settled_idx ON public.supplier_ledger(kind, settled);

CREATE OR REPLACE FUNCTION public.recompute_supplier_settlement(p_supplier_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_left numeric;
  v_bill public.supplier_ledger%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.suppliers WHERE id = p_supplier_id FOR UPDATE;
  UPDATE public.supplier_ledger SET settled = false
  WHERE supplier_id = p_supplier_id AND kind = 'bill' AND settled = true;
  SELECT COALESCE(sum(amount), 0) INTO v_left
  FROM public.supplier_ledger
  WHERE supplier_id = p_supplier_id AND kind = 'payment' AND voided_at IS NULL;
  FOR v_bill IN
    SELECT * FROM public.supplier_ledger
    WHERE supplier_id = p_supplier_id AND kind = 'bill' AND voided_at IS NULL
    ORDER BY entry_date ASC, created_at ASC, id ASC FOR UPDATE
  LOOP
    EXIT WHEN v_left < v_bill.amount;
    v_left := v_left - v_bill.amount;
    UPDATE public.supplier_ledger SET settled = true WHERE id = v_bill.id;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.recompute_supplier_settlement(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_supplier_settlement(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.record_supplier_entry(
  p_supplier_id uuid,
  p_kind public.supplier_entry_kind,
  p_amount numeric,
  p_category public.supplier_category,
  p_method public.supplier_pay_method,
  p_entry_date date,
  p_due_date date,
  p_bill_number text,
  p_reference text,
  p_note text,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_email text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry_id uuid; v_amount numeric;
BEGIN
  PERFORM 1 FROM public.suppliers WHERE id = p_supplier_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier not found.'; END IF;
  v_amount := round(p_amount, 2);
  IF p_kind <> 'adjustment' AND v_amount <= 0 THEN RAISE EXCEPTION 'Enter an amount greater than zero.'; END IF;
  IF p_kind = 'adjustment' AND v_amount = 0 THEN RAISE EXCEPTION 'Adjustment cannot be zero.'; END IF;
  INSERT INTO public.supplier_ledger(supplier_id, kind, amount, category, method, entry_date, due_date, bill_number, reference, note, created_by, created_by_name, created_by_email)
  VALUES (p_supplier_id, p_kind, v_amount, COALESCE(p_category, 'other'), p_method, COALESCE(p_entry_date, CURRENT_DATE), p_due_date, nullif(trim(COALESCE(p_bill_number, '')), ''), nullif(trim(COALESCE(p_reference, '')), ''), nullif(trim(COALESCE(p_note, '')), ''), p_actor_id, p_actor_name, p_actor_email)
  RETURNING id INTO v_entry_id;
  IF p_kind IN ('bill', 'payment') THEN PERFORM public.recompute_supplier_settlement(p_supplier_id); END IF;
  RETURN v_entry_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_supplier_entry(uuid,public.supplier_entry_kind,numeric,public.supplier_category,public.supplier_pay_method,date,date,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_supplier_entry(uuid,public.supplier_entry_kind,numeric,public.supplier_category,public.supplier_pay_method,date,date,text,text,text,uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.void_supplier_entry(p_entry_id uuid, p_reason text, p_actor_id uuid, p_actor_name text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry public.supplier_ledger%ROWTYPE;
BEGIN
  SELECT * INTO v_entry FROM public.supplier_ledger WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Supplier entry not found.'; END IF;
  IF v_entry.voided_at IS NOT NULL THEN RETURN false; END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 3 THEN RAISE EXCEPTION 'Add a reason for voiding this entry.'; END IF;
  UPDATE public.supplier_ledger SET voided_at = now(), voided_by = p_actor_id, void_reason = trim(p_reason) WHERE id = p_entry_id;
  IF v_entry.kind IN ('bill', 'payment') THEN PERFORM public.recompute_supplier_settlement(v_entry.supplier_id); END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.void_supplier_entry(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.void_supplier_entry(uuid,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.supplier_balance(_supplier_id uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT round(COALESCE(s.opening_balance, 0)
    + COALESCE(sum(l.amount) FILTER (WHERE l.kind = 'bill' AND l.voided_at IS NULL), 0)
    - COALESCE(sum(l.amount) FILTER (WHERE l.kind = 'payment' AND l.voided_at IS NULL), 0)
    + COALESCE(sum(l.amount) FILTER (WHERE l.kind = 'adjustment' AND l.voided_at IS NULL), 0), 2)
  FROM public.suppliers s LEFT JOIN public.supplier_ledger l ON l.supplier_id = s.id
  WHERE s.id = _supplier_id GROUP BY s.id, s.opening_balance
$$;
REVOKE ALL ON FUNCTION public.supplier_balance(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_balance(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.supplier_ledger_page(
  p_from date, p_to date, p_supplier uuid, p_kind text, p_category text, p_method text,
  p_query text, p_show_voided boolean, p_offset integer, p_limit integer
) RETURNS TABLE(
  id uuid, supplier_id uuid, supplier_name text, kind public.supplier_entry_kind, amount numeric,
  category public.supplier_category, method public.supplier_pay_method, entry_date date, due_date date,
  bill_number text, reference text, note text, settled boolean, voided_at timestamptz, void_reason text,
  created_by_name text, created_by_email text, created_at timestamptz, total_count bigint,
  total_billed numeric, total_paid numeric, total_adjustments numeric, net_movement numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH filtered AS (
    SELECT l.*, s.name AS supplier_name
    FROM public.supplier_ledger l JOIN public.suppliers s ON s.id = l.supplier_id
    WHERE l.entry_date BETWEEN p_from AND p_to
      AND (p_supplier IS NULL OR l.supplier_id = p_supplier)
      AND (p_kind IS NULL OR l.kind::text = p_kind)
      AND (p_category IS NULL OR l.category::text = p_category)
      AND (p_method IS NULL OR l.method::text = p_method)
      AND (COALESCE(p_show_voided, false) OR l.voided_at IS NULL)
      AND (COALESCE(trim(p_query), '') = '' OR s.name ILIKE '%' || trim(p_query) || '%' OR COALESCE(l.bill_number, '') ILIKE '%' || trim(p_query) || '%' OR COALESCE(l.reference, '') ILIKE '%' || trim(p_query) || '%' OR COALESCE(l.note, '') ILIKE '%' || trim(p_query) || '%')
  )
  SELECT f.id, f.supplier_id, f.supplier_name, f.kind, f.amount, f.category, f.method, f.entry_date,
    f.due_date, f.bill_number, f.reference, f.note, f.settled, f.voided_at, f.void_reason,
    f.created_by_name, f.created_by_email, f.created_at, count(*) OVER (),
    COALESCE(sum(f.amount) FILTER (WHERE f.kind = 'bill' AND f.voided_at IS NULL) OVER (), 0),
    COALESCE(sum(f.amount) FILTER (WHERE f.kind = 'payment' AND f.voided_at IS NULL) OVER (), 0),
    COALESCE(sum(f.amount) FILTER (WHERE f.kind = 'adjustment' AND f.voided_at IS NULL) OVER (), 0),
    COALESCE(sum(CASE WHEN f.voided_at IS NOT NULL THEN 0 WHEN f.kind = 'bill' THEN f.amount WHEN f.kind = 'payment' THEN -f.amount ELSE f.amount END) OVER (), 0)
  FROM filtered f
  ORDER BY f.entry_date DESC, f.created_at DESC
  OFFSET GREATEST(p_offset, 0) LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
REVOKE ALL ON FUNCTION public.supplier_ledger_page(date,date,uuid,text,text,text,text,boolean,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_ledger_page(date,date,uuid,text,text,text,text,boolean,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.supplier_summary_page(p_offset integer, p_limit integer, p_query text)
RETURNS TABLE(id uuid, name text, phone text, gstin text, address text, note text, opening_balance numeric, payment_terms_days integer, active boolean, created_at timestamptz, total_billed numeric, total_paid numeric, balance numeric, last_payment_on date, oldest_unsettled_due date, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH summary AS (
    SELECT s.id, s.name, s.phone, s.gstin, s.address, s.note, s.opening_balance, s.payment_terms_days, s.active, s.created_at,
      COALESCE(sum(l.amount) FILTER (WHERE l.kind = 'bill' AND l.voided_at IS NULL), 0)::numeric AS total_billed,
      COALESCE(sum(l.amount) FILTER (WHERE l.kind = 'payment' AND l.voided_at IS NULL), 0)::numeric AS total_paid,
      round(s.opening_balance + COALESCE(sum(CASE WHEN l.voided_at IS NOT NULL THEN 0 WHEN l.kind = 'bill' THEN l.amount WHEN l.kind = 'payment' THEN -l.amount ELSE l.amount END), 0), 2) AS balance,
      max(l.entry_date) FILTER (WHERE l.kind = 'payment' AND l.voided_at IS NULL) AS last_payment_on,
      min(l.due_date) FILTER (WHERE l.kind = 'bill' AND NOT l.settled AND l.voided_at IS NULL) AS oldest_unsettled_due
    FROM public.suppliers s LEFT JOIN public.supplier_ledger l ON l.supplier_id = s.id
    WHERE COALESCE(trim(p_query), '') = '' OR s.name ILIKE '%' || trim(p_query) || '%' OR COALESCE(s.phone, '') ILIKE '%' || trim(p_query) || '%' OR COALESCE(s.gstin, '') ILIKE '%' || trim(p_query) || '%'
    GROUP BY s.id
  )
  SELECT summary.*, count(*) OVER () FROM summary
  ORDER BY balance DESC, name ASC
  OFFSET GREATEST(p_offset, 0) LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
REVOKE ALL ON FUNCTION public.supplier_summary_page(integer,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.supplier_summary_page(integer,integer,text) TO service_role;

CREATE OR REPLACE FUNCTION public.manager_vendor_float_totals(p_month_from date)
RETURNS TABLE(vendor_id uuid, collected_all_time numeric, collected_this_month numeric, paid_out_all_time numeric, paid_out_this_month numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id,
    COALESCE(sum(vp.amount) FILTER (WHERE vp.linked_ledger_id IS NOT NULL), 0)::numeric,
    COALESCE(sum(vp.amount) FILTER (WHERE vp.linked_ledger_id IS NOT NULL AND vp.paid_on >= p_month_from), 0)::numeric,
    COALESCE(sum(vp.amount) FILTER (WHERE vp.linked_ledger_id IS NULL), 0)::numeric,
    COALESCE(sum(vp.amount) FILTER (WHERE vp.linked_ledger_id IS NULL AND vp.paid_on >= p_month_from), 0)::numeric
  FROM public.qr_vendors v LEFT JOIN public.vendor_payments vp ON vp.vendor_id = v.id
  GROUP BY v.id;
$$;
REVOKE ALL ON FUNCTION public.manager_vendor_float_totals(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manager_vendor_float_totals(date) TO service_role;