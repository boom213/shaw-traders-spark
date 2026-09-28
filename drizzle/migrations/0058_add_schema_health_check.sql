CREATE OR REPLACE FUNCTION public.schema_health(p_objects text[])
RETURNS TABLE(object text, present boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT requested.object,
    CASE
      WHEN position('.' in requested.object) > 0 THEN EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = split_part(requested.object, '.', 1)
          AND c.column_name = split_part(requested.object, '.', 2)
      )
      ELSE EXISTS (
        SELECT 1
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
          AND t.table_name = requested.object
      )
    END AS present
  FROM unnest(p_objects) AS requested(object);
$$;

REVOKE ALL ON FUNCTION public.schema_health(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.schema_health(text[]) FROM anon;
REVOKE ALL ON FUNCTION public.schema_health(text[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.schema_health(text[]) TO service_role;