REVOKE EXECUTE ON FUNCTION public.release_order(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_order(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.release_order(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.release_order(uuid, text) TO service_role;