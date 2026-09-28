CREATE OR REPLACE FUNCTION public.decide_trade_application(
  p_application_id uuid,
  p_decision public.trade_application_status,
  p_note text,
  p_tier public.price_tier,
  p_reviewer text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_application public.trade_applications%ROWTYPE;
  v_decided_at timestamptz := now();
  v_updated integer;
BEGIN
  IF p_decision NOT IN ('approved'::public.trade_application_status, 'rejected'::public.trade_application_status, 'more_info_needed'::public.trade_application_status) THEN
    RAISE EXCEPTION 'Unsupported trade application decision';
  END IF;

  SELECT * INTO v_application
  FROM public.trade_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade application not found';
  END IF;

  UPDATE public.trade_applications
  SET status = p_decision,
      decision_note = NULLIF(btrim(COALESCE(p_note, '')), ''),
      reviewer = p_reviewer,
      decided_at = v_decided_at,
      requested_tier = CASE WHEN p_decision = 'approved'::public.trade_application_status THEN p_tier ELSE requested_tier END,
      updated_at = v_decided_at
  WHERE id = p_application_id;

  IF p_decision = 'approved'::public.trade_application_status THEN
    UPDATE public.profiles
    SET customer_type = 'trade'::public.customer_type,
        price_tier = p_tier,
        trade_approved_at = v_decided_at,
        business_name = v_application.business_name
    WHERE id = v_application.profile_id;
  ELSE
    UPDATE public.profiles
    SET trade_approved_at = NULL
    WHERE id = v_application.profile_id;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Linked customer profile not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_trade_application(uuid, public.trade_application_status, text, public.price_tier, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_trade_application(uuid, public.trade_application_status, text, public.price_tier, text) FROM anon;
REVOKE ALL ON FUNCTION public.decide_trade_application(uuid, public.trade_application_status, text, public.price_tier, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.decide_trade_application(uuid, public.trade_application_status, text, public.price_tier, text) TO service_role;