-- Staff role lookup helper (highest privilege first)
CREATE OR REPLACE FUNCTION public.staff_role(_user_id uuid)
RETURNS public.staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.staff_roles
  WHERE profile_id = _user_id
  ORDER BY CASE role WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END
  LIMIT 1
$$;

-- True while no staff account exists yet, so the first owner can be claimed.
CREATE OR REPLACE FUNCTION public.staff_bootstrap_needed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.staff_roles)
$$;

-- Sign-in attempt log used for rate limiting staff sign-in.
CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  kind text NOT NULL DEFAULT 'staff_signin',
  ok boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.auth_attempts TO service_role;

ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS auth_attempts_lookup
  ON public.auth_attempts (identifier, kind, created_at DESC);
