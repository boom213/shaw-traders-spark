CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fuzzy search indexes
CREATE INDEX IF NOT EXISTS products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_sku_trgm ON public.products USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_brand_trgm ON public.products USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_model_trgm ON public.products USING gin (model gin_trgm_ops);
CREATE INDEX IF NOT EXISTS compat_model_trgm ON public.product_compatibility USING gin (vehicle_model gin_trgm_ops);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS box_contents text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS staff_reply text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS staff_replied_at timestamptz;
ALTER TABLE public.user_lists ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  contact text NOT NULL,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_alerts_unique ON public.stock_alerts (product_id, contact) WHERE notified_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_alerts TO authenticated;
GRANT INSERT ON public.stock_alerts TO anon;
GRANT ALL ON public.stock_alerts TO service_role;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can ask to be told when stock returns"
  ON public.stock_alerts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff read stock alerts"
  ON public.stock_alerts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Typo-tolerant search across name, code, brand and vehicle model
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
           CASE WHEN lower(p.name) LIKE '%' || t.q || '%' THEN 0.75 ELSE 0 END,
           CASE WHEN lower(coalesce(p.sku, '')) LIKE '%' || t.q || '%' THEN 0.9 ELSE 0 END,
           CASE WHEN lower(coalesce(p.brand, '')) LIKE '%' || t.q || '%' THEN 0.6 ELSE 0 END,
           CASE WHEN lower(coalesce(p.subcategory, '')) LIKE '%' || t.q || '%' THEN 0.55 ELSE 0 END,
           CASE WHEN EXISTS (
             SELECT 1 FROM public.product_compatibility pc
             WHERE pc.product_id = p.id AND lower(pc.vehicle_model) LIKE '%' || t.q || '%'
           ) THEN 0.7 ELSE 0 END
         )::real AS score
  FROM public.products p, t
  WHERE p.is_active
    AND t.q <> ''
  ORDER BY 2 DESC, p.name
  LIMIT LEAST(GREATEST(p_limit, 1), 500)
$$;

REVOKE ALL ON FUNCTION public.search_product_ids(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.search_product_ids(text, int) TO anon, authenticated, service_role;

-- Coupon preview so checkout can show the discount before the order is placed
CREATE OR REPLACE FUNCTION public.preview_coupon(p_code text, p_subtotal numeric)
RETURNS TABLE(valid boolean, discount numeric, message text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v public.coupons%ROWTYPE;
  d numeric := 0;
BEGIN
  SELECT * INTO v FROM public.coupons
    WHERE upper(code) = upper(trim(coalesce(p_code, '')))
      AND is_active
      AND (starts_at IS NULL OR starts_at <= now())
      AND (expires_at IS NULL OR expires_at >= now())
      AND (usage_limit IS NULL OR times_used < usage_limit);

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::numeric, 'This code is not valid right now.';
    RETURN;
  END IF;

  IF coalesce(p_subtotal, 0) < v.min_order THEN
    RETURN QUERY SELECT false, 0::numeric,
      'Add items worth at least ' || v.min_order::text || ' to use this code.';
    RETURN;
  END IF;

  IF v.type = 'percent' THEN
    d := round(p_subtotal * v.value / 100);
  ELSE
    d := v.value;
  END IF;
  IF v.max_discount IS NOT NULL THEN d := LEAST(d, v.max_discount); END IF;
  d := LEAST(d, p_subtotal);

  RETURN QUERY SELECT true, d, 'Code applied.';
END;
$$;

REVOKE ALL ON FUNCTION public.preview_coupon(text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.preview_coupon(text, numeric) TO anon, authenticated, service_role;