ALTER TABLE public.counter_sale_payments
  ADD COLUMN vendor_id uuid REFERENCES public.qr_vendors(id),
  ADD COLUMN recorded_by_email text;

CREATE INDEX counter_sale_payments_vendor_idx
  ON public.counter_sale_payments(vendor_id, received_on DESC)
  WHERE vendor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.record_counter_sale_payment_with_vendor(
  p_order_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_note text,
  p_received_on date,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_email text,
  p_vendor_id uuid
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sale public.counter_sales%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_paid numeric;
  v_balance numeric;
  v_method public.trade_payment_method;
  v_ledger_id uuid;
  v_vendor_name text;
BEGIN
  SELECT * INTO v_sale FROM public.counter_sales WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_sale.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'This counter sale is not open.'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM public.counter_sale_payments WHERE order_id = p_order_id;
  v_balance := v_order.total - v_paid;
  IF p_amount <= 0 OR p_amount > v_balance + 0.009 THEN
    RAISE EXCEPTION 'Payment must be more than zero and no more than the remaining balance.';
  END IF;

  v_method := CASE lower(trim(p_method))
    WHEN 'cash' THEN 'cash'::public.trade_payment_method
    WHEN 'upi' THEN 'upi_qr'::public.trade_payment_method
    WHEN 'vendor qr' THEN 'upi_qr'::public.trade_payment_method
    WHEN 'bank transfer' THEN 'bank_transfer'::public.trade_payment_method
    ELSE 'other'::public.trade_payment_method
  END;

  IF v_method IN ('upi_qr', 'bank_transfer') AND length(trim(COALESCE(p_reference, ''))) = 0 THEN
    RAISE EXCEPTION 'Add the UTR or payment reference.';
  END IF;

  IF lower(trim(p_method)) = 'vendor qr' THEN
    IF p_vendor_id IS NULL THEN RAISE EXCEPTION 'Choose an active vendor.'; END IF;
    SELECT name INTO v_vendor_name FROM public.qr_vendors WHERE id = p_vendor_id AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active vendor.'; END IF;
  ELSIF p_vendor_id IS NOT NULL THEN
    RAISE EXCEPTION 'A vendor can only be linked to a Vendor QR payment.';
  END IF;

  INSERT INTO public.counter_sale_payments(order_id, amount, method, reference, note, received_on, recorded_by, recorded_by_name, recorded_by_email, vendor_id)
  VALUES (p_order_id, round(p_amount, 2), trim(p_method), nullif(trim(COALESCE(p_reference, '')), ''), nullif(trim(COALESCE(p_note, '')), ''), COALESCE(p_received_on, CURRENT_DATE), p_actor_id, p_actor_name, nullif(trim(COALESCE(p_actor_email, '')), ''), p_vendor_id);

  INSERT INTO public.trade_ledger(profile_id, order_id, kind, amount, method, reference, note, received_on, due_date, created_by)
  VALUES (v_sale.profile_id, p_order_id, 'payment', round(p_amount, 2), v_method, nullif(trim(COALESCE(p_reference, '')), ''), 'Payment for ' || v_order.human_id || ' · ' || trim(p_method) || CASE WHEN v_vendor_name IS NOT NULL THEN ' · ' || v_vendor_name ELSE '' END, COALESCE(p_received_on, CURRENT_DATE), COALESCE(p_received_on, CURRENT_DATE), p_actor_name)
  RETURNING id INTO v_ledger_id;

  IF p_vendor_id IS NOT NULL THEN
    INSERT INTO public.vendor_payments(vendor_id, amount, paid_on, reference, note, linked_ledger_id, created_by, created_by_name, created_by_email)
    VALUES (p_vendor_id, round(p_amount, 2), COALESCE(p_received_on, CURRENT_DATE), nullif(trim(COALESCE(p_reference, '')), ''), nullif(trim(COALESCE(p_note, '')), ''), v_ledger_id, p_actor_id, p_actor_name, p_actor_email);
  END IF;

  v_balance := round(v_balance - p_amount, 2);
  IF v_balance <= 0.009 THEN
    UPDATE public.orders SET payment_status = 'paid' WHERE id = p_order_id;
    UPDATE public.trade_ledger SET settled = true WHERE order_id = p_order_id AND kind = 'invoice';
  END IF;

  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (p_order_id, v_order.status, 'Offline payment received: ' || round(p_amount, 2)::text || ' via ' || trim(p_method) || CASE WHEN v_vendor_name IS NOT NULL THEN ' · ' || v_vendor_name ELSE '' END, p_actor_name);

  RETURN GREATEST(v_balance, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.record_counter_sale_payment_with_vendor(uuid,numeric,text,text,text,date,uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_counter_sale_payment_with_vendor(uuid,numeric,text,text,text,date,uuid,text,text,uuid) TO service_role;