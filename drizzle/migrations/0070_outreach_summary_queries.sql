CREATE OR REPLACE FUNCTION public.list_outreach_lists()
RETURNS TABLE(
  id uuid,
  name text,
  uploaded_by text,
  total integer,
  pending bigint,
  sent bigint,
  skipped bigint,
  created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    l.id,
    l.name,
    l.uploaded_by,
    l.total,
    count(c.id) FILTER (WHERE c.status = 'pending') AS pending,
    count(c.id) FILTER (WHERE c.status = 'sent') AS sent,
    count(c.id) FILTER (WHERE c.status = 'skipped') AS skipped,
    l.created_at
  FROM public.outreach_lists l
  LEFT JOIN public.outreach_contacts c ON c.list_id = l.id
  GROUP BY l.id, l.name, l.uploaded_by, l.total, l.created_at
  ORDER BY l.created_at DESC
  LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.list_outreach_lists() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_outreach_lists() TO service_role;

CREATE OR REPLACE FUNCTION public.outreach_list_counts(p_list_id uuid)
RETURNS TABLE(pending bigint, sent bigint, skipped bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    count(*) FILTER (WHERE status = 'pending') AS pending,
    count(*) FILTER (WHERE status = 'sent') AS sent,
    count(*) FILTER (WHERE status = 'skipped') AS skipped
  FROM public.outreach_contacts
  WHERE list_id = p_list_id;
$$;
REVOKE ALL ON FUNCTION public.outreach_list_counts(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_list_counts(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';