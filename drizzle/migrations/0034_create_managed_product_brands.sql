CREATE TABLE public.product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_brands_name_not_blank CHECK (length(btrim(name)) > 0)
);

GRANT ALL ON public.product_brands TO service_role;

ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX product_brands_name_lower_unique
  ON public.product_brands (lower(btrim(name)));

CREATE INDEX product_brands_name_order_idx
  ON public.product_brands (name);

CREATE TRIGGER product_brands_touch_updated_at
  BEFORE UPDATE ON public.product_brands
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.product_brands (name)
SELECT DISTINCT ON (lower(btrim(brand))) btrim(brand)
FROM public.products
WHERE brand IS NOT NULL AND btrim(brand) <> ''
ORDER BY lower(btrim(brand)), btrim(brand);