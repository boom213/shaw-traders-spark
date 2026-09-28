CREATE OR REPLACE FUNCTION public.manage_order_page(
  p_query text DEFAULT '',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 8,
  p_status text DEFAULT '',
  p_payment_status text DEFAULT ''
)
RETURNS TABLE(order_id uuid, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parameters AS (
    SELECT NULLIF(BTRIM(p_query), '') AS query_text,
           NULLIF(BTRIM(p_status), '') AS order_status,
           NULLIF(BTRIM(p_payment_status), '') AS pay_status
  ),
  matching_orders AS (
    SELECT o.id, o.placed_at
    FROM public.orders o
    CROSS JOIN parameters params
    WHERE (params.query_text IS NULL
       OR o.human_id ILIKE '%' || params.query_text || '%'
       OR o.contact_phone ILIKE '%' || params.query_text || '%'
       OR o.address->>'name' ILIKE '%' || params.query_text || '%')
      AND (params.order_status IS NULL OR o.status::text = params.order_status)
      AND (params.pay_status IS NULL
        OR (params.pay_status = 'needs_review' AND o.needs_payment_review)
        OR (params.pay_status <> 'needs_review' AND o.payment_status::text = params.pay_status))
      AND NOT EXISTS (
        SELECT 1 FROM public.counter_sales cs WHERE cs.order_id = o.id
      )
  ),
  matching_count AS (SELECT COUNT(*) AS total_count FROM matching_orders),
  page_orders AS (
    SELECT matching_order.id, matching_order.placed_at
    FROM matching_orders matching_order
    ORDER BY matching_order.placed_at DESC, matching_order.id DESC
    OFFSET GREATEST(p_offset, 0)
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT page_order.id, matching_count.total_count
  FROM page_orders page_order
  CROSS JOIN matching_count
  ORDER BY page_order.placed_at DESC, page_order.id DESC
$$;

REVOKE ALL ON FUNCTION public.manage_order_page(text,integer,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_order_page(text,integer,integer,text,text) TO service_role;