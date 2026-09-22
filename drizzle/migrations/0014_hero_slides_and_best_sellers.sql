CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text,
  heading text NOT NULL,
  subline text,
  button_label text,
  button_href text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hero_slides_order_idx ON public.hero_slides (is_active, sort_order);

GRANT SELECT ON public.hero_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_slides TO authenticated;
GRANT ALL ON public.hero_slides TO service_role;

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active slides" ON public.hero_slides
  FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE POLICY "Staff write slides" ON public.hero_slides
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER hero_slides_touch BEFORE UPDATE ON public.hero_slides
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.best_sellers(p_days integer DEFAULT 90, p_limit integer DEFAULT 12)
RETURNS TABLE(product_id uuid, sold bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.product_id, SUM(oi.qty)::bigint AS sold
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id IS NOT NULL
    AND o.placed_at >= now() - make_interval(days => GREATEST(1, LEAST(365, p_days)))
    AND o.status <> 'cancelled'
  GROUP BY oi.product_id
  ORDER BY sold DESC
  LIMIT GREATEST(1, LEAST(50, p_limit));
$$;

GRANT EXECUTE ON FUNCTION public.best_sellers(integer, integer) TO anon, authenticated, service_role;

INSERT INTO public.hero_slides (heading, subline, button_label, button_href, sort_order, is_active) VALUES
  ('Everything Your EV Needs. Under One Roof.', 'Batteries, chargers, motors, controllers, body parts and EV accessories.', 'Shop Products', '/shop', 1, true),
  ('Genuine EV Batteries & Chargers', 'Trusted brands, tested before they leave our counter in Bud Bud.', 'See batteries', '/category/ev-batteries', 2, true),
  ('Dealer & Bulk Supply', 'Special rates for workshops, dealers and fleet owners across Bardhaman.', 'Bulk enquiry', '/bulk', 3, true);
