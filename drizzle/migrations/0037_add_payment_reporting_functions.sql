CREATE INDEX IF NOT EXISTS counter_sale_payments_report_date_idx ON public.counter_sale_payments(received_on DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS payment_events_order_type_created_idx ON public.payment_events(order_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS refunds_report_created_idx ON public.refunds(created_at DESC, order_id);

CREATE OR REPLACE FUNCTION public.payment_report_summary(p_from date, p_to date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH counter_filtered AS (
  SELECT csp.amount, csp.received_on,
    CASE lower(trim(csp.method))
      WHEN 'cash' THEN 'Cash'
      WHEN 'upi' THEN 'UPI'
      WHEN 'vendor qr' THEN 'Vendor QR'
      WHEN 'bank transfer' THEN 'Bank transfer'
      WHEN 'cheque' THEN 'Cheque'
      ELSE 'Other'
    END AS method
  FROM public.counter_sale_payments csp
  WHERE csp.received_on BETWEEN p_from AND p_to
), method_totals AS (
  SELECT method, count(*)::integer AS payments, round(sum(amount), 2) AS amount
  FROM counter_filtered GROUP BY method
), days AS (
  SELECT generate_series(p_from, p_to, interval '1 day')::date AS day
), chart AS (
  SELECT d.day,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'Cash'), 0) AS cash,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'UPI'), 0) AS upi,
    COALESCE(sum(c.amount) FILTER (WHERE c.method = 'Vendor QR'), 0) AS vendor_qr,
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
  FROM public.orders o
  LEFT JOIN confirmed c ON c.order_id = o.id
  WHERE o.payment_status IN ('paid', 'refunded')
    AND (o.payment_provider = 'razorpay' OR o.provider_payment_id IS NOT NULL OR lower(COALESCE(o.payment_method, '')) = 'online')
    AND NOT EXISTS (SELECT 1 FROM public.counter_sales cs WHERE cs.order_id = o.id)
), online_filtered AS (
  SELECT * FROM online_receipts
  WHERE (paid_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN p_from AND p_to
), online_refunds AS (
  SELECT COALESCE(sum(r.amount), 0) AS amount
  FROM public.refunds r
  JOIN public.orders o ON o.id = r.order_id
  WHERE r.status <> 'failed'
    AND (r.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN p_from AND p_to
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
$$;
REVOKE ALL ON FUNCTION public.payment_report_summary(date,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_report_summary(date,date) TO service_role;

CREATE OR REPLACE FUNCTION public.counter_payment_report_page(p_from date, p_to date, p_offset integer, p_limit integer)
RETURNS TABLE(id uuid, received_on date, created_at timestamptz, order_id uuid, human_id text, customer_name text, amount numeric, method text, vendor_name text, reference text, note text, recorded_by_name text, recorded_by_email text, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY csp.received_on DESC, csp.created_at DESC
  OFFSET GREATEST(p_offset, 0) LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
REVOKE ALL ON FUNCTION public.counter_payment_report_page(date,date,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.counter_payment_report_page(date,date,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.online_payment_report_page(p_from date, p_to date, p_offset integer, p_limit integer)
RETURNS TABLE(order_id uuid, paid_at timestamptz, human_id text, customer_name text, provider text, payment_id text, gross numeric, refunded numeric, net numeric, status text, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH confirmed AS (
  SELECT pe.order_id, min(pe.created_at) AS paid_at
  FROM public.payment_events pe
  WHERE pe.order_id IS NOT NULL AND pe.event_type IN ('payment.captured', 'order.paid')
  GROUP BY pe.order_id
), eligible AS (
  SELECT o.*, COALESCE(c.paid_at, o.updated_at) AS actual_paid_at
  FROM public.orders o
  LEFT JOIN confirmed c ON c.order_id = o.id
  WHERE o.payment_status IN ('paid', 'refunded')
    AND (o.payment_provider = 'razorpay' OR o.provider_payment_id IS NOT NULL OR lower(COALESCE(o.payment_method, '')) = 'online')
    AND NOT EXISTS (SELECT 1 FROM public.counter_sales cs WHERE cs.order_id = o.id)
)
SELECT e.id, e.actual_paid_at, e.human_id,
  COALESCE(NULLIF(p.full_name, ''), NULLIF(e.address->>'name', ''), 'Customer') AS customer_name,
  COALESCE(e.payment_provider, 'online'), e.provider_payment_id, e.total, e.refunded_total,
  round(e.total - e.refunded_total, 2), e.payment_status::text, count(*) OVER ()
FROM eligible e
LEFT JOIN public.profiles p ON p.id = e.profile_id
WHERE (e.actual_paid_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN p_from AND p_to
ORDER BY e.actual_paid_at DESC
OFFSET GREATEST(p_offset, 0) LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
REVOKE ALL ON FUNCTION public.online_payment_report_page(date,date,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.online_payment_report_page(date,date,integer,integer) TO service_role;