CREATE OR REPLACE FUNCTION public.grant_staff_owner(p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.staff_roles WHERE profile_id = p_profile_id
  ) THEN
    RAISE EXCEPTION 'Staff access not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.staff_roles
    WHERE profile_id = p_profile_id AND role = 'super_admin'::public.staff_role
  ) THEN
    RAISE EXCEPTION 'Super admin access cannot be changed';
  END IF;

  DELETE FROM public.staff_roles WHERE profile_id = p_profile_id;
  INSERT INTO public.staff_roles (profile_id, role)
  VALUES (p_profile_id, 'owner'::public.staff_role);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_staff_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_staff_owner(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_staff_owner(uuid) TO service_role;