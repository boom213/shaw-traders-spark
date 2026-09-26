CREATE OR REPLACE FUNCTION public.manage_customer_page(
  p_query text DEFAULT '',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 25
)
RETURNS TABLE(
  id uuid,
  phone text,
  name text,
  email text,
  city text,
  customer_type public.customer_type,
  price_tier public.price_tier,
  spend numeric,
  last_order_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      p.id,
      p.phone,
      COALESCE(NULLIF(p.full_name, ''), NULLIF(p.email, ''), 'Customer') AS name,
      p.email,
      a.city,
      p.customer_type,
      p.price_tier,
      COALESCE(o.spend, 0)::numeric AS spend,
      o.last_order_at,
      p.created_at
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT ad.city
      FROM public.addresses ad
      WHERE ad.profile_id = p.id
      ORDER BY ad.is_default DESC, ad.created_at DESC
      LIMIT 1
    ) a ON true
    LEFT JOIN LATERAL (
      SELECT SUM(ord.total)::numeric AS spend, MAX(ord.placed_at) AS last_order_at
      FROM public.orders ord
      WHERE ord.profile_id = p.id
    ) o ON true
    WHERE NULLIF(BTRIM(p_query), '') IS NULL
       OR CONCAT_WS(' ', p.full_name, p.email, p.phone, a.city) ILIKE '%' || BTRIM(p_query) || '%'
  )
  SELECT
    f.id,
    COALESCE(f.phone, ''),
    f.name,
    f.email,
    f.city,
    f.customer_type,
    f.price_tier,
    f.spend,
    f.last_order_at,
    COUNT(*) OVER () AS total_count
  FROM filtered f
  ORDER BY f.last_order_at DESC NULLS LAST, f.created_at DESC
  OFFSET GREATEST(p_offset, 0)
  LIMIT LEAST(GREATEST(p_limit, 1), 100)
$$;

REVOKE ALL ON FUNCTION public.manage_customer_page(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_customer_page(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.manager_stats()
RETURNS TABLE(
  products bigint,
  categories bigint,
  no_price bigint,
  no_photo bigint,
  low_stock bigint,
  out_of_stock bigint,
  orders bigint,
  revenue numeric,
  customers bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH product_totals AS (
    SELECT
      COUNT(*) AS products,
      COUNT(*) FILTER (WHERE p.price IS NULL) AS no_price,
      COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id
      )) AS no_photo,
      COUNT(*) FILTER (WHERE p.stock > 0 AND p.stock <= 3) AS low_stock,
      COUNT(*) FILTER (WHERE p.stock = 0) AS out_of_stock
    FROM public.products p
    WHERE p.status = 'visible'
  ),
  order_totals AS (
    SELECT
      COUNT(*) AS orders,
      COALESCE(SUM(o.total), 0)::numeric AS revenue,
      COUNT(DISTINCT COALESCE(NULLIF(o.contact_phone, ''), o.profile_id::text))
        FILTER (WHERE NULLIF(o.contact_phone, '') IS NOT NULL OR o.profile_id IS NOT NULL) AS customers
    FROM public.orders o
  )
  SELECT
    pt.products,
    (SELECT COUNT(*) FROM public.categories),
    pt.no_price,
    pt.no_photo,
    pt.low_stock,
    pt.out_of_stock,
    ot.orders,
    ot.revenue,
    ot.customers
  FROM product_totals pt CROSS JOIN order_totals ot
$$;

REVOKE ALL ON FUNCTION public.manager_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manager_stats() TO service_role;