ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS icon TEXT;

UPDATE public.categories
SET icon = CASE slug
  WHEN 'ev-batteries' THEN 'battery-charging'
  WHEN 'chargers' THEN 'plug-zap'
  WHEN 'motors' THEN 'cog'
  WHEN 'controllers' THEN 'cpu'
  WHEN 'brake-parts' THEN 'disc-3'
  WHEN 'lighting' THEN 'lightbulb'
  ELSE icon
END
WHERE icon IS NULL;

ALTER POLICY "Public read categories"
ON public.categories
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.reorder_categories(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_distinct integer;
  v_known integer;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Staff access required';
  END IF;

  SELECT cardinality(p_ids), count(DISTINCT id)
  INTO v_total, v_distinct
  FROM unnest(p_ids) AS id;

  SELECT count(*) INTO v_known
  FROM public.categories
  WHERE id = ANY(p_ids);

  IF v_total IS NULL OR v_total = 0 OR v_total <> v_distinct OR v_total <> v_known THEN
    RAISE EXCEPTION 'Category order must contain unique existing categories';
  END IF;

  UPDATE public.categories AS c
  SET sort_order = ordered.position
  FROM unnest(p_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE c.id = ordered.id;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_categories(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[]) TO service_role;