CREATE OR REPLACE FUNCTION public.mark_order_paid(p_order_id uuid, p_payment_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_order.payment_status = 'paid' THEN RETURN false; END IF;

  IF v_order.status = 'cancelled' OR v_order.stock_released THEN
    UPDATE public.orders
    SET payment_status = 'paid',
        needs_payment_review = true,
        payment_review_note = 'Payment confirmed after auto-cancellation',
        provider_payment_id = COALESCE(provider_payment_id, p_payment_id)
    WHERE id = p_order_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.order_events
      WHERE order_id = p_order_id
        AND note = 'Payment confirmed after auto-cancellation — needs manual review'
    ) THEN
      INSERT INTO public.order_events(order_id, status, note, created_by)
      VALUES (p_order_id, v_order.status, 'Payment confirmed after auto-cancellation — needs manual review', 'razorpay');
    END IF;
    RETURN false;
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      provider_payment_id = p_payment_id,
      status = CASE WHEN status = 'order_confirmed' THEN 'processing'::public.order_status ELSE status END
  WHERE id = p_order_id;

  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (p_order_id, 'processing', 'Payment received', 'razorpay');
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_order_paid(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid,text) TO service_role;

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
    SET payment_status = 'paid',
        needs_payment_review = true,
        payment_review_note = 'Token payment received after cancellation — needs manual review',
        provider_payment_id = COALESCE(provider_payment_id, p_payment_id),
        updated_at = now()
    WHERE id = p_booking_id;

    IF NOT EXISTS (
      SELECT 1 FROM public.booking_events
      WHERE booking_id = p_booking_id
        AND note = 'Token payment received after cancellation — needs manual review'
    ) THEN
      INSERT INTO public.booking_events(booking_id, status, note, created_by)
      VALUES (p_booking_id, v_booking.status, 'Token payment received after cancellation — needs manual review', 'razorpay');
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