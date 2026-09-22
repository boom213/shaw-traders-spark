CREATE TABLE IF NOT EXISTS public.error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'client',
  message text NOT NULL,
  stack text,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_log_created_at_idx ON public.error_log (created_at DESC);

GRANT SELECT ON public.error_log TO authenticated;
GRANT ALL ON public.error_log TO service_role;

ALTER TABLE public.error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read error log" ON public.error_log;
CREATE POLICY "Staff can read error log"
  ON public.error_log FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.health_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  detail text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_alerts_created_at_idx ON public.health_alerts (created_at DESC);

GRANT SELECT ON public.health_alerts TO authenticated;
GRANT ALL ON public.health_alerts TO service_role;

ALTER TABLE public.health_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read health alerts" ON public.health_alerts;
CREATE POLICY "Staff can read health alerts"
  ON public.health_alerts FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));
