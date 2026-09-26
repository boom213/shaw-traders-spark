CREATE OR REPLACE FUNCTION public.rename_product_brand(p_brand_id uuid, p_new_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_name text;
  v_name text := btrim(p_new_name);
BEGIN
  IF v_name = '' OR length(v_name) > 120 THEN
    RAISE EXCEPTION 'Enter a brand name up to 120 characters.';
  END IF;

  SELECT name INTO v_old_name
  FROM public.product_brands
  WHERE id = p_brand_id
  FOR UPDATE;

  IF v_old_name IS NULL THEN
    RAISE EXCEPTION 'Brand not found.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.product_brands
    WHERE lower(btrim(name)) = lower(v_name)
      AND id <> p_brand_id
  ) THEN
    RAISE EXCEPTION 'That brand already exists.';
  END IF;

  UPDATE public.product_brands
  SET name = v_name
  WHERE id = p_brand_id;

  UPDATE public.products
  SET brand = v_name
  WHERE lower(btrim(brand)) = lower(btrim(v_old_name));

  RETURN v_old_name;
END;
$$;

REVOKE ALL ON FUNCTION public.rename_product_brand(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_product_brand(uuid, text) TO service_role;