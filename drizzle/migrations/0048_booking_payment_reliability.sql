ALTER TABLE public.payment_events
  ADD COLUMN booking_id uuid REFERENCES public.vehicle_bookings(id) ON DELETE SET NULL;

CREATE INDEX payment_events_booking_type_created_idx
  ON public.payment_events(booking_id, event_type, created_at DESC);

ALTER TABLE public.vehicle_bookings
  ADD COLUMN needs_payment_review boolean NOT NULL DEFAULT false,
  ADD COLUMN payment_review_note text;

CREATE INDEX vehicle_bookings_payment_review_idx
  ON public.vehicle_bookings(created_at DESC)
  WHERE needs_payment_review;

CREATE OR REPLACE FUNCTION public.mark_booking_paid(p_booking_id uuid, p_payment_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.vehicle_bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking
  FROM public.vehicle_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_booking.payment_status = 'paid' THEN RETURN false; END IF;

  IF v_booking.status = 'cancelled' THEN
    UPDATE public.vehicle_bookings
    SET needs_payment_review = true,
        payment_review_note = 'Payment confirmed after cancellation',
        provider_payment_id = COALESCE(provider_payment_id, p_payment_id),
        updated_at = now()
    WHERE id = p_booking_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.booking_events
      WHERE booking_id = p_booking_id
        AND note = 'Payment confirmed after cancellation — needs manual review'
    ) THEN
      INSERT INTO public.booking_events(booking_id, status, note, created_by)
      VALUES (p_booking_id, v_booking.status, 'Payment confirmed after cancellation — needs manual review', 'razorpay');
    END IF;
    RETURN false;
  END IF;

  UPDATE public.vehicle_bookings
  SET payment_status = 'paid',
      provider_payment_id = p_payment_id,
      updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO public.booking_events(booking_id, status, note, created_by)
  VALUES (p_booking_id, v_booking.status, 'Token amount received', 'razorpay');
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_booking_paid(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_booking_paid(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_booking_payment_review(
  p_booking_id uuid,
  p_note text,
  p_actor text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.vehicle_bookings%ROWTYPE;
BEGIN
  IF length(trim(COALESCE(p_note, ''))) < 3 THEN
    RAISE EXCEPTION 'Add a review note.';
  END IF;

  SELECT * INTO v_booking
  FROM public.vehicle_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_booking.needs_payment_review THEN RETURN false; END IF;

  UPDATE public.vehicle_bookings
  SET needs_payment_review = false,
      payment_review_note = trim(p_note),
      updated_at = now()
  WHERE id = p_booking_id;

  INSERT INTO public.booking_events(booking_id, status, note, created_by)
  VALUES (p_booking_id, v_booking.status, 'Payment review resolved — ' || trim(p_note), p_actor);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_booking_payment_review(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_booking_payment_review(uuid,text,text) TO service_role;