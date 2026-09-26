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
), period_rows AS (
  SELECT e.*,
    CASE WHEN (e.actual_paid_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN p_from AND p_to THEN e.total ELSE 0 END AS period_gross,
    COALESCE((SELECT sum(r.amount) FROM public.refunds r WHERE r.order_id = e.id AND r.status <> 'failed' AND (r.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN p_from AND p_to), 0) AS period_refunded,
    GREATEST(e.actual_paid_at, COALESCE((SELECT max(r.created_at) FROM public.refunds r WHERE r.order_id = e.id AND r.status <> 'failed' AND (r.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN p_from AND p_to), e.actual_paid_at)) AS activity_at
  FROM eligible e
)
SELECT e.id, e.activity_at, e.human_id,
  COALESCE(NULLIF(p.full_name, ''), NULLIF(e.address->>'name', ''), 'Customer') AS customer_name,
  COALESCE(e.payment_provider, 'online'), e.provider_payment_id, round(e.period_gross, 2), round(e.period_refunded, 2),
  round(e.period_gross - e.period_refunded, 2),
  CASE WHEN e.period_gross = 0 AND e.period_refunded > 0 THEN 'refund' ELSE e.payment_status::text END,
  count(*) OVER ()
FROM period_rows e
LEFT JOIN public.profiles p ON p.id = e.profile_id
WHERE e.period_gross > 0 OR e.period_refunded > 0
ORDER BY e.activity_at DESC
OFFSET GREATEST(p_offset, 0) LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;
REVOKE ALL ON FUNCTION public.online_payment_report_page(date,date,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.online_payment_report_page(date,date,integer,integer) TO service_role;