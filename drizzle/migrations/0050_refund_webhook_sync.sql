CREATE UNIQUE INDEX refunds_provider_refund_id_uidx
  ON public.refunds(provider_refund_id);

CREATE OR REPLACE FUNCTION public.sync_order_refund_total(p_order_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_total numeric;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;

  SELECT COALESCE(sum(amount), 0)
  INTO v_total
  FROM public.refunds
  WHERE order_id = p_order_id
    AND status NOT IN ('failed', 'cancelled');

  UPDATE public.orders
  SET refunded_total = v_total,
      payment_status = CASE
        WHEN v_total >= v_order.total - 0.01 THEN 'refunded'::public.payment_status
        WHEN v_order.payment_status = 'refunded' AND v_total < v_order.total - 0.01 THEN 'paid'::public.payment_status
        ELSE v_order.payment_status
      END
  WHERE id = p_order_id;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_order_refund_total(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_order_refund_total(uuid) TO service_role;