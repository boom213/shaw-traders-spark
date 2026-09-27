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
REVOKE ALL ON FUNCTION public.reorder_categories(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.reorder_categories(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[]) TO service_role;

ALTER POLICY "Staff write categories"
ON public.categories
TO authenticated
USING (public.staff_role(auth.uid()) IN ('owner'::public.staff_role, 'super_admin'::public.staff_role))
WITH CHECK (public.staff_role(auth.uid()) IN ('owner'::public.staff_role, 'super_admin'::public.staff_role));