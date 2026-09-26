CREATE INDEX IF NOT EXISTS addresses_profile_idx ON public.addresses(profile_id);

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
  WITH parameters AS (
    SELECT NULLIF(BTRIM(p_query), '') AS query_text
  ),
  matching_profiles AS (
    SELECT
      p.id,
      p.phone,
      COALESCE(NULLIF(p.full_name, ''), NULLIF(p.email, ''), 'Customer') AS name,
      p.email,
      p.customer_type,
      p.price_tier,
      p.created_at,
      (
        SELECT MAX(ord.placed_at)
        FROM public.orders ord
        WHERE ord.profile_id = p.id
      ) AS last_order_at
    FROM public.profiles p
    CROSS JOIN parameters params
    WHERE params.query_text IS NULL
       OR CONCAT_WS(' ', p.full_name, p.email, p.phone) ILIKE '%' || params.query_text || '%'
       OR EXISTS (
         SELECT 1
         FROM public.addresses search_address
         WHERE search_address.profile_id = p.id
           AND search_address.city ILIKE '%' || params.query_text || '%'
       )
  ),
  matching_count AS (
    SELECT COUNT(*) AS total_count
    FROM matching_profiles
  ),
  page_profiles AS (
    SELECT mp.*
    FROM matching_profiles mp
    ORDER BY mp.last_order_at DESC NULLS LAST, mp.created_at DESC
    OFFSET GREATEST(p_offset, 0)
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT
    page_profile.id,
    COALESCE(page_profile.phone, ''),
    page_profile.name,
    page_profile.email,
    address.city,
    page_profile.customer_type,
    page_profile.price_tier,
    COALESCE(order_summary.spend, 0)::numeric AS spend,
    page_profile.last_order_at,
    matching_count.total_count
  FROM page_profiles page_profile
  CROSS JOIN matching_count
  LEFT JOIN LATERAL (
    SELECT customer_address.city
    FROM public.addresses customer_address
    WHERE customer_address.profile_id = page_profile.id
    ORDER BY customer_address.is_default DESC, customer_address.created_at DESC
    LIMIT 1
  ) address ON true
  LEFT JOIN LATERAL (
    SELECT SUM(customer_order.total)::numeric AS spend
    FROM public.orders customer_order
    WHERE customer_order.profile_id = page_profile.id
  ) order_summary ON true
  ORDER BY page_profile.last_order_at DESC NULLS LAST, page_profile.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.manage_customer_page(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_customer_page(text, integer, integer) TO service_role;