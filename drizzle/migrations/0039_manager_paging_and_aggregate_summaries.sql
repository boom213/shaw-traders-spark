CREATE OR REPLACE FUNCTION public.manager_dashboard_summary(
  p_today_from timestamptz,
  p_week_from timestamptz,
  p_month_from timestamptz
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH live_orders AS (
    SELECT id, total, status, placed_at
    FROM public.orders
    WHERE placed_at >= p_month_from
      AND status::text NOT IN ('cancelled', 'returned')
  ), order_totals AS (
    SELECT
      COUNT(*) FILTER (WHERE placed_at >= p_today_from) AS today_orders,
      COALESCE(SUM(total) FILTER (WHERE placed_at >= p_today_from), 0) AS today_revenue,
      COALESCE(SUM(total) FILTER (WHERE placed_at >= p_week_from), 0) AS week_revenue,
      COALESCE(SUM(total), 0) AS month_revenue,
      COUNT(*) FILTER (WHERE status::text IN ('order_confirmed', 'processing')) AS pending_orders
    FROM live_orders
  ), sellers AS (
    SELECT oi.name_snapshot AS name, SUM(oi.qty)::integer AS qty,
      COALESCE(SUM(oi.qty * COALESCE(oi.price_snapshot, 0)), 0) AS revenue
    FROM live_orders o JOIN public.order_items oi ON oi.order_id = o.id
    GROUP BY oi.name_snapshot ORDER BY SUM(oi.qty) DESC, oi.name_snapshot LIMIT 6
  ), visible_products AS (
    SELECT p.id, p.name, p.stock, COALESCE(p.reorder_threshold, 3) AS threshold,
      p.price, EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id) AS has_photo
    FROM public.products p WHERE p.status::text = 'visible'
  ), product_totals AS (
    SELECT COUNT(*) FILTER (WHERE NOT has_photo) AS no_photo,
      COUNT(*) FILTER (WHERE price IS NULL) AS no_price
    FROM visible_products
  ), low_stock AS (
    SELECT id, name, stock, threshold FROM visible_products
    WHERE stock <= threshold ORDER BY stock, name LIMIT 20
  )
  SELECT jsonb_build_object(
    'todayOrders', ot.today_orders,
    'todayRevenue', ot.today_revenue,
    'weekRevenue', ot.week_revenue,
    'monthRevenue', ot.month_revenue,
    'pendingOrders', ot.pending_orders,
    'bestSellers', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM sellers s), '[]'::jsonb),
    'noPhoto', pt.no_photo,
    'noPrice', pt.no_price,
    'lowStock', COALESCE((SELECT jsonb_agg(to_jsonb(l)) FROM low_stock l), '[]'::jsonb)
  ) FROM order_totals ot CROSS JOIN product_totals pt
$$;

CREATE OR REPLACE FUNCTION public.manager_product_attention_counts()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'belowThreshold', COUNT(*) FILTER (WHERE p.stock <= COALESCE(p.reorder_threshold, 3)),
    'noPhoto', COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id)),
    'noPrice', COUNT(*) FILTER (WHERE p.price IS NULL)
  )
  FROM public.products p WHERE p.status::text = 'visible'
$$;

CREATE OR REPLACE FUNCTION public.manager_customer_order_summary(p_profile_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'orderCount', COUNT(DISTINCT o.id),
    'lifetimeValue', COALESCE(SUM(DISTINCT o.total), 0),
    'productIds', COALESCE(jsonb_agg(DISTINCT oi.product_id) FILTER (WHERE oi.product_id IS NOT NULL), '[]'::jsonb)
  )
  FROM public.orders o LEFT JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.profile_id = p_profile_id
$$;

CREATE OR REPLACE FUNCTION public.manager_vendor_payment_totals(p_month_from date)
RETURNS TABLE(vendor_id uuid, all_time numeric, this_month numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.id,
    COALESCE(SUM(vp.amount), 0)::numeric AS all_time,
    COALESCE(SUM(vp.amount) FILTER (WHERE vp.paid_on >= p_month_from), 0)::numeric AS this_month
  FROM public.qr_vendors v LEFT JOIN public.vendor_payments vp ON vp.vendor_id = v.id
  GROUP BY v.id
$$;

REVOKE ALL ON FUNCTION public.manager_dashboard_summary(timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manager_product_attention_counts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manager_customer_order_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manager_vendor_payment_totals(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manager_dashboard_summary(timestamptz, timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.manager_product_attention_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.manager_customer_order_summary(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.manager_vendor_payment_totals(date) TO service_role;