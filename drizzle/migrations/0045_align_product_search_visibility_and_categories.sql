CREATE OR REPLACE FUNCTION public.search_product_ids(p_term text, p_limit int DEFAULT 200)
RETURNS TABLE(id uuid, score real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH t AS (SELECT lower(trim(coalesce(p_term, ''))) AS q)
  SELECT p.id,
         GREATEST(
           similarity(lower(p.name), t.q),
           similarity(lower(coalesce(p.sku, '')), t.q),
           similarity(lower(coalesce(p.brand, '')), t.q),
           similarity(lower(coalesce(p.model, '')), t.q),
           similarity(lower(coalesce(c.name, '')), t.q),
           similarity(lower(coalesce(c.slug, '')), t.q),
           CASE WHEN lower(p.name) LIKE '%' || t.q || '%' THEN 0.75 ELSE 0 END,
           CASE WHEN lower(coalesce(p.sku, '')) LIKE '%' || t.q || '%' THEN 0.9 ELSE 0 END,
           CASE WHEN lower(coalesce(p.brand, '')) LIKE '%' || t.q || '%' THEN 0.6 ELSE 0 END,
           CASE WHEN lower(coalesce(p.subcategory, '')) LIKE '%' || t.q || '%' THEN 0.55 ELSE 0 END,
           CASE WHEN lower(coalesce(c.name, '')) LIKE '%' || t.q || '%' THEN 0.7 ELSE 0 END,
           CASE WHEN lower(coalesce(c.slug, '')) LIKE '%' || t.q || '%' THEN 0.7 ELSE 0 END,
           CASE WHEN EXISTS (
             SELECT 1 FROM public.product_compatibility pc
             WHERE pc.product_id = p.id AND lower(pc.vehicle_model) LIKE '%' || t.q || '%'
           ) THEN 0.7 ELSE 0 END
         )::real AS score
  FROM public.products p
  LEFT JOIN public.categories c ON c.id = p.category_id
  CROSS JOIN t
  WHERE p.status = 'visible'
    AND p.product_kind = 'part'
    AND t.q <> ''
  ORDER BY 2 DESC, p.name
  LIMIT LEAST(GREATEST(p_limit, 1), 500)
$$;

REVOKE ALL ON FUNCTION public.search_product_ids(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.search_product_ids(text, int) TO anon, authenticated, service_role;

UPDATE public.products
SET is_active = (status = 'visible')
WHERE is_active IS DISTINCT FROM (status = 'visible');