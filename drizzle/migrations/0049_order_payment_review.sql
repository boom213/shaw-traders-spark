ALTER TABLE public.orders
  ADD COLUMN needs_payment_review boolean NOT NULL DEFAULT false,
  ADD COLUMN payment_review_note text;

CREATE INDEX orders_payment_review_idx
  ON public.orders(placed_at DESC)
  WHERE needs_payment_review;

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
    SET needs_payment_review = true,
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

CREATE OR REPLACE FUNCTION public.resolve_payment_review(
  p_order_id uuid,
  p_note text,
  p_actor text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF length(trim(COALESCE(p_note, ''))) < 3 THEN
    RAISE EXCEPTION 'Add a review note.';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT v_order.needs_payment_review THEN RETURN false; END IF;

  UPDATE public.orders
  SET needs_payment_review = false,
      payment_review_note = trim(p_note)
  WHERE id = p_order_id;

  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (p_order_id, v_order.status, 'Payment review resolved — ' || trim(p_note), p_actor);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_payment_review(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_payment_review(uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.manage_order_page(
  p_query text DEFAULT '',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 8,
  p_status text DEFAULT '',
  p_payment_status text DEFAULT ''
)
RETURNS TABLE(order_id uuid, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parameters AS (
    SELECT NULLIF(BTRIM(p_query), '') AS query_text,
           NULLIF(BTRIM(p_status), '') AS order_status,
           NULLIF(BTRIM(p_payment_status), '') AS pay_status
  ),
  matching_orders AS (
    SELECT o.id, o.placed_at
    FROM public.orders o
    CROSS JOIN parameters params
    WHERE (params.query_text IS NULL
       OR o.human_id ILIKE '%' || params.query_text || '%'
       OR o.contact_phone ILIKE '%' || params.query_text || '%'
       OR o.address->>'name' ILIKE '%' || params.query_text || '%')
      AND (params.order_status IS NULL OR o.status::text = params.order_status)
      AND (params.pay_status IS NULL
        OR (params.pay_status = 'needs_review' AND o.needs_payment_review)
        OR (params.pay_status <> 'needs_review' AND o.payment_status::text = params.pay_status))
  ),
  matching_count AS (SELECT COUNT(*) AS total_count FROM matching_orders),
  page_orders AS (
    SELECT matching_order.id, matching_order.placed_at
    FROM matching_orders matching_order
    ORDER BY matching_order.placed_at DESC, matching_order.id DESC
    OFFSET GREATEST(p_offset, 0)
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT page_order.id, matching_count.total_count
  FROM page_orders page_order
  CROSS JOIN matching_count
  ORDER BY page_order.placed_at DESC, page_order.id DESC
$$;

REVOKE ALL ON FUNCTION public.manage_order_page(text,integer,integer,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_order_page(text,integer,integer,text,text) TO service_role;