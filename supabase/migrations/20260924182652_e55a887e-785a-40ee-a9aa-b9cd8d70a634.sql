CREATE TABLE public.trade_doc_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  field text NOT NULL,
  path text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','unclear','mismatch','error')),
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  issues text[] NOT NULL DEFAULT '{}',
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, field)
);
GRANT SELECT ON public.trade_doc_checks TO authenticated;
GRANT ALL ON public.trade_doc_checks TO service_role;
ALTER TABLE public.trade_doc_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or staff read checks" ON public.trade_doc_checks FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.trade_internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.trade_applications(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.trade_internal_notes(application_id, created_at);
GRANT SELECT, INSERT ON public.trade_internal_notes TO authenticated;
GRANT ALL ON public.trade_internal_notes TO service_role;
ALTER TABLE public.trade_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read notes" ON public.trade_internal_notes FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff add notes" ON public.trade_internal_notes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));