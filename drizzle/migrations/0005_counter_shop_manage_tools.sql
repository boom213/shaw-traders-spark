ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_threshold integer;

CREATE TABLE public.search_misses (
  term text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 1,
  last_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.search_misses TO authenticated;
GRANT ALL ON public.search_misses TO service_role;

ALTER TABLE public.search_misses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read search misses"
  ON public.search_misses FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_search_miss(p_term text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_term text;
BEGIN
  v_term := lower(btrim(p_term));
  IF v_term IS NULL OR length(v_term) < 2 OR length(v_term) > 80 THEN RETURN; END IF;
  INSERT INTO public.search_misses (term, hits, last_at)
    VALUES (v_term, 1, now())
  ON CONFLICT (term) DO UPDATE
    SET hits = public.search_misses.hits + 1, last_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_search_miss(text) TO anon, authenticated;