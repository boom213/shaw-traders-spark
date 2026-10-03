CREATE TABLE public.outreach_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  uploaded_by text,
  total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.outreach_lists TO authenticated;
GRANT ALL ON public.outreach_lists TO service_role;
ALTER TABLE public.outreach_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read outreach lists"
ON public.outreach_lists FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE TABLE public.outreach_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.outreach_lists(id) ON DELETE CASCADE,
  name text,
  phone text NOT NULL,
  message text NOT NULL,
  link_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'skipped')),
  skip_reason text,
  sent_at timestamptz,
  sent_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.outreach_contacts TO authenticated;
GRANT ALL ON public.outreach_contacts TO service_role;
ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read outreach contacts"
ON public.outreach_contacts FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX outreach_contacts_list_status_idx
ON public.outreach_contacts(list_id, status);

CREATE OR REPLACE FUNCTION public.create_outreach_list(
  p_name text,
  p_uploaded_by text,
  p_contacts jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_list_id uuid;
  v_contact jsonb;
  v_count integer;
BEGIN
  IF nullif(trim(COALESCE(p_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Enter a list name.';
  END IF;
  IF p_contacts IS NULL OR jsonb_typeof(p_contacts) <> 'array' THEN
    RAISE EXCEPTION 'Add at least one valid contact.';
  END IF;
  v_count := jsonb_array_length(p_contacts);
  IF v_count < 1 THEN RAISE EXCEPTION 'Add at least one valid contact.'; END IF;
  IF v_count > 5000 THEN RAISE EXCEPTION 'A list can contain at most 5,000 contacts.'; END IF;

  INSERT INTO public.outreach_lists(name, uploaded_by, total)
  VALUES (left(trim(p_name), 160), nullif(trim(COALESCE(p_uploaded_by, '')), ''), v_count)
  RETURNING id INTO v_list_id;

  FOR v_contact IN SELECT value FROM jsonb_array_elements(p_contacts) LOOP
    IF nullif(trim(COALESCE(v_contact->>'phone', '')), '') IS NULL
       OR nullif(trim(COALESCE(v_contact->>'message', '')), '') IS NULL THEN
      RAISE EXCEPTION 'Every contact needs a phone number and message.';
    END IF;
    INSERT INTO public.outreach_contacts(list_id, name, phone, message, link_url)
    VALUES (
      v_list_id,
      nullif(left(trim(COALESCE(v_contact->>'name', '')), 160), ''),
      left(trim(v_contact->>'phone'), 15),
      left(trim(v_contact->>'message'), 4000),
      nullif(left(trim(COALESCE(v_contact->>'link_url', '')), 2000), '')
    );
  END LOOP;

  RETURN v_list_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_outreach_list(text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_outreach_list(text,text,jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';