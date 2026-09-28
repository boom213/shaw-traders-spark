ALTER TABLE public.counter_sale_payments
  ADD COLUMN status text NOT NULL DEFAULT 'cleared',
  ADD COLUMN cleared_on date,
  ADD COLUMN voided_at timestamptz,
  ADD COLUMN voided_by uuid,
  ADD COLUMN void_reason text,
  ADD COLUMN linked_ledger_id uuid REFERENCES public.trade_ledger(id);

ALTER TABLE public.counter_sale_payments
  ADD CONSTRAINT counter_sale_payments_status_check
  CHECK (status IN ('cleared', 'pending', 'bounced')) NOT VALID;
ALTER TABLE public.counter_sale_payments VALIDATE CONSTRAINT counter_sale_payments_status_check;
CREATE UNIQUE INDEX counter_sale_payments_linked_ledger_id_idx
  ON public.counter_sale_payments(linked_ledger_id) WHERE linked_ledger_id IS NOT NULL;
CREATE INDEX counter_sale_payments_effective_order_idx
  ON public.counter_sale_payments(order_id, status, voided_at);

ALTER TABLE public.vendor_payments ADD COLUMN voided_at timestamptz;
CREATE INDEX vendor_payments_active_vendor_date_idx
  ON public.vendor_payments(vendor_id, paid_on DESC) WHERE voided_at IS NULL;

CREATE OR REPLACE FUNCTION public.record_counter_sale_payment_with_vendor(
  p_order_id uuid, p_amount numeric, p_method text, p_reference text, p_note text,
  p_received_on date, p_actor_id uuid, p_actor_name text, p_actor_email text, p_vendor_id uuid
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_sale public.counter_sales%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_paid numeric;
  v_balance numeric;
  v_method public.trade_payment_method;
  v_method_label text := lower(trim(p_method));
  v_status text;
  v_payment_id uuid;
  v_ledger_id uuid;
  v_vendor_name text;
BEGIN
  SELECT * INTO v_sale FROM public.counter_sales WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_sale.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'This counter sale is not open.'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  SELECT COALESCE(sum(amount), 0) INTO v_paid
  FROM public.counter_sale_payments
  WHERE order_id = p_order_id AND voided_at IS NULL AND status <> 'bounced';
  v_balance := v_order.total - v_paid;
  IF p_amount <= 0 OR p_amount > v_balance + 0.009 THEN
    RAISE EXCEPTION 'Payment must be more than zero and no more than the remaining balance.';
  END IF;

  v_method := CASE v_method_label
    WHEN 'cash' THEN 'cash'::public.trade_payment_method
    WHEN 'upi' THEN 'upi_qr'::public.trade_payment_method
    WHEN 'vendor' THEN 'upi_qr'::public.trade_payment_method
    WHEN 'vendor qr' THEN 'upi_qr'::public.trade_payment_method
    WHEN 'bank transfer' THEN 'bank_transfer'::public.trade_payment_method
    WHEN 'cheque' THEN 'cheque'::public.trade_payment_method
    ELSE 'other'::public.trade_payment_method
  END;
  v_status := CASE WHEN v_method_label = 'cheque' THEN 'pending' ELSE 'cleared' END;

  IF v_method_label IN ('upi', 'vendor', 'vendor qr', 'bank transfer', 'cheque')
     AND length(trim(COALESCE(p_reference, ''))) = 0 THEN
    RAISE EXCEPTION 'Add the payment reference.';
  END IF;

  IF p_vendor_id IS NOT NULL THEN
    IF v_method_label NOT IN ('vendor', 'vendor qr') THEN
      RAISE EXCEPTION 'A vendor can only be linked to a Vendor payment.';
    END IF;
    SELECT name INTO v_vendor_name FROM public.qr_vendors WHERE id = p_vendor_id AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active vendor.'; END IF;
  END IF;

  INSERT INTO public.counter_sale_payments(
    order_id, amount, method, reference, note, received_on, recorded_by,
    recorded_by_name, recorded_by_email, vendor_id, status, cleared_on
  ) VALUES (
    p_order_id, round(p_amount, 2), trim(p_method), nullif(trim(COALESCE(p_reference, '')), ''),
    nullif(trim(COALESCE(p_note, '')), ''), COALESCE(p_received_on, CURRENT_DATE), p_actor_id,
    p_actor_name, nullif(trim(COALESCE(p_actor_email, '')), ''), p_vendor_id, v_status,
    CASE WHEN v_status = 'cleared' THEN COALESCE(p_received_on, CURRENT_DATE) ELSE NULL END
  ) RETURNING id INTO v_payment_id;

  INSERT INTO public.trade_ledger(
    profile_id, order_id, kind, amount, method, reference, note,
    received_on, due_date, created_by
  ) VALUES (
    v_sale.profile_id, p_order_id, 'payment', round(p_amount, 2), v_method,
    nullif(trim(COALESCE(p_reference, '')), ''),
    'Payment for ' || v_order.human_id || ' · ' || trim(p_method) ||
      CASE WHEN v_vendor_name IS NOT NULL THEN ' · ' || v_vendor_name ELSE '' END,
    COALESCE(p_received_on, CURRENT_DATE), COALESCE(p_received_on, CURRENT_DATE), p_actor_name
  ) RETURNING id INTO v_ledger_id;

  UPDATE public.counter_sale_payments SET linked_ledger_id = v_ledger_id WHERE id = v_payment_id;

  IF p_vendor_id IS NOT NULL THEN
    INSERT INTO public.vendor_payments(
      vendor_id, amount, paid_on, reference, note, linked_ledger_id,
      created_by, created_by_name, created_by_email
    ) VALUES (
      p_vendor_id, round(p_amount, 2), COALESCE(p_received_on, CURRENT_DATE),
      nullif(trim(COALESCE(p_reference, '')), ''), nullif(trim(COALESCE(p_note, '')), ''),
      v_ledger_id, p_actor_id, p_actor_name, p_actor_email
    );
  END IF;

  v_balance := round(v_balance - p_amount, 2);
  IF v_balance <= 0.009 THEN
    UPDATE public.orders SET payment_status = 'paid' WHERE id = p_order_id;
    UPDATE public.trade_ledger SET settled = true WHERE order_id = p_order_id AND kind = 'invoice';
  END IF;

  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (
    p_order_id, v_order.status,
    CASE WHEN v_status = 'pending' THEN 'Pending cheque recorded: ' ELSE 'Offline payment received: ' END ||
      round(p_amount, 2)::text || ' via ' || trim(p_method) ||
      CASE WHEN v_vendor_name IS NOT NULL THEN ' · ' || v_vendor_name ELSE '' END,
    p_actor_name
  );

  RETURN GREATEST(v_balance, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.void_counter_sale_payment(
  p_payment_id uuid, p_reason text, p_actor_id uuid, p_actor_name text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_payment public.counter_sale_payments%ROWTYPE;
  v_sale public.counter_sales%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_paid numeric;
  v_balance numeric;
BEGIN
  IF length(trim(COALESCE(p_reason, ''))) < 3 THEN RAISE EXCEPTION 'Add a reason for voiding this payment.'; END IF;
  SELECT * INTO v_payment FROM public.counter_sale_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found.'; END IF;
  IF v_payment.voided_at IS NOT NULL THEN RAISE EXCEPTION 'This payment is already voided.'; END IF;
  IF v_payment.status = 'bounced' THEN RAISE EXCEPTION 'A bounced cheque cannot also be voided.'; END IF;

  SELECT * INTO v_sale FROM public.counter_sales WHERE order_id = v_payment.order_id FOR UPDATE;
  SELECT * INTO v_order FROM public.orders WHERE id = v_payment.order_id FOR UPDATE;

  UPDATE public.counter_sale_payments
  SET voided_at = now(), voided_by = p_actor_id, void_reason = trim(p_reason)
  WHERE id = p_payment_id;

  INSERT INTO public.trade_ledger(profile_id, order_id, kind, amount, method, reference, note, received_on, due_date, settled, created_by)
  VALUES (
    v_sale.profile_id, v_payment.order_id, 'adjustment', v_payment.amount, 'other',
    v_payment.reference, 'Reversal of payment: ' || trim(p_reason), CURRENT_DATE, CURRENT_DATE, true, p_actor_name
  );

  IF v_payment.linked_ledger_id IS NOT NULL THEN
    UPDATE public.vendor_payments SET voided_at = now()
    WHERE linked_ledger_id = v_payment.linked_ledger_id AND voided_at IS NULL;
  END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_paid
  FROM public.counter_sale_payments
  WHERE order_id = v_payment.order_id AND voided_at IS NULL AND status <> 'bounced';
  v_balance := GREATEST(round(v_order.total - v_paid, 2), 0);

  IF v_balance > 0.009 AND v_order.payment_status = 'paid' THEN
    UPDATE public.orders SET payment_status = 'cod_pending' WHERE id = v_payment.order_id;
    UPDATE public.trade_ledger SET settled = false WHERE order_id = v_payment.order_id AND kind = 'invoice';
  END IF;

  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (v_payment.order_id, v_order.status, 'Payment voided: ' || round(v_payment.amount, 2)::text || ' · ' || trim(p_reason), p_actor_name);
  RETURN v_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_cheque_status(
  p_payment_id uuid, p_status text, p_cleared_on date, p_actor_name text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_payment public.counter_sale_payments%ROWTYPE;
  v_sale public.counter_sales%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_paid numeric;
  v_balance numeric;
BEGIN
  IF p_status NOT IN ('cleared', 'bounced') THEN RAISE EXCEPTION 'Choose cleared or bounced.'; END IF;
  SELECT * INTO v_payment FROM public.counter_sale_payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found.'; END IF;
  IF lower(trim(v_payment.method)) <> 'cheque' THEN RAISE EXCEPTION 'Only cheque payments have clearance status.'; END IF;
  IF v_payment.voided_at IS NOT NULL THEN RAISE EXCEPTION 'A voided payment cannot be changed.'; END IF;
  IF v_payment.status = p_status THEN
    SELECT GREATEST(round(o.total - COALESCE(sum(csp.amount) FILTER (WHERE csp.voided_at IS NULL AND csp.status <> 'bounced'), 0), 2), 0)
      INTO v_balance FROM public.orders o LEFT JOIN public.counter_sale_payments csp ON csp.order_id = o.id
      WHERE o.id = v_payment.order_id GROUP BY o.total;
    RETURN v_balance;
  END IF;
  IF v_payment.status <> 'pending' THEN RAISE EXCEPTION 'This cheque has already been decided.'; END IF;

  SELECT * INTO v_sale FROM public.counter_sales WHERE order_id = v_payment.order_id FOR UPDATE;
  SELECT * INTO v_order FROM public.orders WHERE id = v_payment.order_id FOR UPDATE;

  IF p_status = 'cleared' THEN
    UPDATE public.counter_sale_payments SET status = 'cleared', cleared_on = COALESCE(p_cleared_on, CURRENT_DATE) WHERE id = p_payment_id;
  ELSE
    UPDATE public.counter_sale_payments SET status = 'bounced', cleared_on = NULL WHERE id = p_payment_id;
    INSERT INTO public.trade_ledger(profile_id, order_id, kind, amount, method, reference, note, received_on, due_date, settled, created_by)
    VALUES (
      v_sale.profile_id, v_payment.order_id, 'adjustment', v_payment.amount, 'other',
      v_payment.reference, 'Reversal of bounced cheque ' || COALESCE(v_payment.reference, ''), CURRENT_DATE, CURRENT_DATE, true, p_actor_name
    );
    IF v_payment.linked_ledger_id IS NOT NULL THEN
      UPDATE public.vendor_payments SET voided_at = now()
      WHERE linked_ledger_id = v_payment.linked_ledger_id AND voided_at IS NULL;
    END IF;
  END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_paid
  FROM public.counter_sale_payments
  WHERE order_id = v_payment.order_id AND voided_at IS NULL AND status <> 'bounced';
  v_balance := GREATEST(round(v_order.total - v_paid, 2), 0);

  IF v_balance > 0.009 THEN
    UPDATE public.orders SET payment_status = 'cod_pending' WHERE id = v_payment.order_id AND payment_status = 'paid';
    UPDATE public.trade_ledger SET settled = false WHERE order_id = v_payment.order_id AND kind = 'invoice';
  ELSIF p_status = 'cleared' THEN
    UPDATE public.orders SET payment_status = 'paid' WHERE id = v_payment.order_id;
    UPDATE public.trade_ledger SET settled = true WHERE order_id = v_payment.order_id AND kind = 'invoice';
  END IF;

  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (v_payment.order_id, v_order.status, 'Cheque marked ' || p_status || ': ' || round(v_payment.amount, 2)::text, p_actor_name);
  RETURN v_balance;
END;
$function$;

REVOKE ALL ON FUNCTION public.void_counter_sale_payment(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.void_counter_sale_payment(uuid, text, uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.set_cheque_status(uuid, text, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_cheque_status(uuid, text, date, text) TO service_role;

CREATE OR REPLACE FUNCTION public.manager_vendor_float_totals(p_month_from date)
RETURNS TABLE(vendor_id uuid, collected_all_time numeric, collected_this_month numeric, paid_out_all_time numeric, paid_out_this_month numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT v.id,
    COALESCE(sum(vp.amount) FILTER (WHERE vp.linked_ledger_id IS NOT NULL AND vp.voided_at IS NULL), 0)::numeric,
    COALESCE(sum(vp.amount) FILTER (WHERE vp.linked_ledger_id IS NOT NULL AND vp.voided_at IS NULL AND vp.paid_on >= p_month_from), 0)::numeric,
    COALESCE(sum(vp.amount) FILTER (WHERE vp.linked_ledger_id IS NULL AND vp.voided_at IS NULL), 0)::numeric,
    COALESCE(sum(vp.amount) FILTER (WHERE vp.linked_ledger_id IS NULL AND vp.voided_at IS NULL AND vp.paid_on >= p_month_from), 0)::numeric
  FROM public.qr_vendors v LEFT JOIN public.vendor_payments vp ON vp.vendor_id = v.id
  GROUP BY v.id;
$function$;

CREATE OR REPLACE FUNCTION public.payment_report_summary(p_from date, p_to date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
WITH counter_filtered AS (
  SELECT csp.amount, csp.received_on,
    CASE lower(trim(csp.method))
      WHEN 'cash' THEN 'Cash'
      WHEN 'upi' THEN 'UPI'
      WHEN 'vendor' THEN 'Vendor'
      WHEN 'vendor qr' THEN 'Vendor'
      WHEN 'bank transfer' THEN 'Bank transfer'
      WHEN 'cheque' THEN 'Cheque'
      ELSE 'Other'
    END AS method
  FROM public.counter_sale_payments csp
  WHERE csp.received_on BETWEEN p_from AND p_to
    AND csp.voided_at IS NULL AND csp.status = 'cleared'
), method_totals AS (
  SELECT method, count(*)::integer AS payments, round(sum(amount), 2) AS amount
  FROM counter_filtered GROUP BY method
), days AS (
  SELECT generate_series(p_from, p_to, interval '1 day')::date AS day
), chart AS (
  SELECT d.day,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'Cash'), 0) AS cash,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'UPI'), 0) AS upi,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'Vendor'), 0) AS vendor_qr,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'Bank transfer'), 0) AS bank_transfer,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'Cheque'), 0) AS cheque,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'Other'), 0) AS other
  FROM days d LEFT JOIN counter_filtered c ON c.received_on = d.day
  GROUP BY d.day ORDER BY d.day
), confirmed AS (
  SELECT pe.order_id, min(pe.created_at) AS paid_at
  FROM public.payment_events pe
  WHERE pe.order_id IS NOT NULL AND pe.event_type IN ('payment.captured', 'order.paid')
  GROUP BY pe.order_id
), online_receipts AS (
  SELECT o.id, o.total, COALESCE(c.paid_at, o.updated_at) AS paid_at
  FROM public.orders o LEFT JOIN confirmed c ON c.order_id = o.id
  WHERE o.payment_status IN ('paid', 'refunded')
    AND (o.payment_provider = 'razorpay' OR o.provider_payment_id IS NOT NULL OR lower(COALESCE(o.payment_method, '')) = 'online')
    AND NOT EXISTS (SELECT 1 FROM public.counter_sales cs WHERE cs.order_id = o.id)
), online_filtered AS (
  SELECT * FROM online_receipts WHERE (paid_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN p_from AND p_to
), online_refunds AS (
  SELECT COALESCE(sum(r.amount), 0) AS amount FROM public.refunds r JOIN public.orders o ON o.id = r.order_id
  WHERE r.status <> 'failed' AND (r.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN p_from AND p_to
    AND NOT EXISTS (SELECT 1 FROM public.counter_sales cs WHERE cs.order_id = o.id)
    AND (o.payment_provider = 'razorpay' OR o.provider_payment_id IS NOT NULL OR lower(COALESCE(o.payment_method, '')) = 'online')
)
SELECT jsonb_build_object(
  'counterAmount', COALESCE((SELECT round(sum(amount), 2) FROM counter_filtered), 0),
  'counterCount', (SELECT count(*) FROM counter_filtered),
  'onlineGross', COALESCE((SELECT round(sum(total), 2) FROM online_filtered), 0),
  'onlineCount', (SELECT count(*) FROM online_filtered),
  'onlineRefunded', COALESCE((SELECT round(amount, 2) FROM online_refunds), 0),
  'onlineNet', COALESCE((SELECT round(sum(total), 2) FROM online_filtered), 0) - COALESCE((SELECT round(amount, 2) FROM online_refunds), 0),
  'methods', COALESCE((SELECT jsonb_agg(jsonb_build_object('method', method, 'payments', payments, 'amount', amount) ORDER BY amount DESC) FROM method_totals), '[]'::jsonb),
  'chart', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', day, 'cash', cash, 'upi', upi, 'vendorQr', vendor_qr, 'bankTransfer', bank_transfer, 'cheque', cheque, 'other', other) ORDER BY day) FROM chart), '[]'::jsonb)
);
$function$;

CREATE OR REPLACE FUNCTION public.counter_payment_report_page(p_from date, p_to date, p_offset integer, p_limit integer)
RETURNS TABLE(id uuid, received_on date, created_at timestamptz, order_id uuid, human_id text, customer_name text, amount numeric, method text, vendor_name text, reference text, note text, recorded_by_name text, recorded_by_email text, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT csp.id, csp.received_on, csp.created_at, csp.order_id, o.human_id,
    COALESCE(NULLIF(p.full_name, ''), NULLIF(o.address->>'name', ''), 'Customer') AS customer_name,
    csp.amount, csp.method, qv.name, csp.reference, csp.note, csp.recorded_by_name, csp.recorded_by_email,
    count(*) OVER () AS total_count
  FROM public.counter_sale_payments csp
  JOIN public.orders o ON o.id = csp.order_id
  LEFT JOIN public.counter_sales cs ON cs.order_id = o.id
  LEFT JOIN public.profiles p ON p.id = cs.profile_id
  LEFT JOIN public.qr_vendors qv ON qv.id = csp.vendor_id
  WHERE csp.received_on BETWEEN p_from AND p_to
    AND csp.voided_at IS NULL AND csp.status = 'cleared'
  ORDER BY csp.received_on DESC, csp.created_at DESC
  OFFSET GREATEST(p_offset, 0) LIMIT LEAST(GREATEST(p_limit, 1), 100);
$function$;