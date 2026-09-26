CREATE OR REPLACE FUNCTION public.manager_customer_order_summary(p_profile_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH order_summary AS (
    SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS lifetime_value
    FROM public.orders WHERE profile_id = p_profile_id
  ), product_summary AS (
    SELECT COALESCE(jsonb_agg(product_id), '[]'::jsonb) AS product_ids
    FROM (
      SELECT DISTINCT oi.product_id
      FROM public.orders o JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.profile_id = p_profile_id AND oi.product_id IS NOT NULL
    ) products
  )
  SELECT jsonb_build_object(
    'orderCount', os.order_count,
    'lifetimeValue', os.lifetime_value,
    'productIds', ps.product_ids
  ) FROM order_summary os CROSS JOIN product_summary ps
$$;
REVOKE ALL ON FUNCTION public.manager_customer_order_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manager_customer_order_summary(uuid) TO service_role;