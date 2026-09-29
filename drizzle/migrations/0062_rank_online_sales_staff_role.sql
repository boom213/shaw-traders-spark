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
  ORDER BY CASE role
    WHEN 'super_admin' THEN 0
    WHEN 'owner' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'staff' THEN 3
    ELSE 4
  END
  LIMIT 1
$$;