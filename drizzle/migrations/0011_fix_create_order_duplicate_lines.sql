-- Backstop: stock can never go negative.
ALTER TABLE public.products
  ADD CONSTRAINT products_stock_not_negative CHECK (stock >= 0) NOT VALID;

-- Aggregate duplicate cart lines by product before validating and locking,
-- so two lines of the same product cannot each pass the stock check.
CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,
  p_address jsonb,
  p_payment_method text,
  p_shipping_code text,
  p_coupon_code text DEFAULT NULL
)
RETURNS TABLE(order_id uuid, human_id text, public_token uuid, total numeric, payment_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty int;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_shipping_label text;
  v_total numeric;
  v_tax numeric := 0;
  v_order_id uuid;
  v_human text;
  v_token uuid;
  v_coupon public.coupons%ROWTYPE;
  v_image text;
  v_attempt int := 0;
  v_settings public.shop_settings%ROWTYPE;
  v_cod boolean;
  v_pay_status public.payment_status;
  v_pincode text;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  -- One line per product, quantities summed, ordered by id to avoid deadlocks.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('product_id', pid, 'qty', q) ORDER BY pid), '[]'::jsonb)
    INTO v_items
  FROM (
    SELECT (e->>'product_id')::uuid AS pid,
           SUM(GREATEST(1, COALESCE((e->>'qty')::int, 1)))::int AS q
    FROM jsonb_array_elements(p_items) AS e
    WHERE e->>'product_id' IS NOT NULL
    GROUP BY 1
  ) agg;

  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  SELECT * INTO v_settings FROM public.shop_settings WHERE id LIMIT 1;

  v_cod := p_payment_method ILIKE '%cash%';
  v_pincode := COALESCE(p_address->>'pincode', '');

  IF p_shipping_code = 'express' THEN
    v_shipping := 120; v_shipping_label := 'Express Delivery (1-3 working days)';
  ELSIF p_shipping_code = 'pickup' THEN
    v_shipping := 0; v_shipping_label := 'Pickup at Bud Bud counter (ready in 2 hours)';
  ELSE
    v_shipping := 0; v_shipping_label := 'Standard Delivery (3-6 working days)';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_qty := (v_item->>'qty')::int;
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND OR NOT v_product.is_active THEN
      RAISE EXCEPTION 'A product in your cart is no longer available.';
    END IF;
    IF COALESCE(v_product.price, 0) <= 0 THEN
      RAISE EXCEPTION 'Please contact us for the price of %', v_product.name;
    END IF;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Only % left of %', v_product.stock, v_product.name;
    END IF;
    v_subtotal := v_subtotal + v_product.price * v_qty;
  END LOOP;

  IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
    SELECT * INTO v_coupon FROM public.coupons
      WHERE upper(code) = upper(trim(p_coupon_code))
        AND is_active
        AND (starts_at IS NULL OR starts_at <= now())
        AND (expires_at IS NULL OR expires_at >= now())
        AND (usage_limit IS NULL OR times_used < usage_limit)
      FOR UPDATE;
    IF FOUND AND v_subtotal >= v_coupon.min_order THEN
      IF v_coupon.type = 'percent' THEN
        v_discount := round(v_subtotal * v_coupon.value / 100);
      ELSE
        v_discount := v_coupon.value;
      END IF;
      IF v_coupon.max_discount IS NOT NULL THEN
        v_discount := LEAST(v_discount, v_coupon.max_discount);
      END IF;
      v_discount := LEAST(v_discount, v_subtotal);
      UPDATE public.coupons SET times_used = times_used + 1 WHERE id = v_coupon.id;
    END IF;
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount + v_shipping);

  IF COALESCE(v_settings.gst_enabled, false) THEN
    IF COALESCE(v_settings.prices_include_gst, true) THEN
      v_tax := round(v_total * v_settings.gst_rate / (100 + v_settings.gst_rate), 2);
    ELSE
      v_tax := round(v_total * v_settings.gst_rate / 100, 2);
      v_total := v_total + v_tax;
    END IF;
  END IF;

  IF v_cod THEN
    IF NOT COALESCE(v_settings.cod_enabled, true) THEN
      RAISE EXCEPTION 'Cash on delivery is not available right now.';
    END IF;
    IF v_settings.cod_limit IS NOT NULL AND v_settings.cod_limit > 0 AND v_total > v_settings.cod_limit THEN
      RAISE EXCEPTION 'Cash on delivery is only available up to %. Please pay online.', v_settings.cod_limit;
    END IF;
    IF array_length(v_settings.cod_pincodes, 1) IS NOT NULL
       AND NOT (v_pincode = ANY (v_settings.cod_pincodes)) THEN
      RAISE EXCEPTION 'Cash on delivery is not available for PIN code %.', v_pincode;
    END IF;
    v_pay_status := 'cod_pending';
  ELSE
    v_pay_status := 'pending';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_human := 'STE-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD') || '-' ||
               lpad(floor(random() * 10000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.human_id = v_human) OR v_attempt > 25;
  END LOOP;

  INSERT INTO public.orders (
    human_id, profile_id, subtotal, shipping_fee, discount, total,
    payment_method, payment_status, shipping_method, address, contact_phone,
    tax_amount, gst_rate, gst_included, gstin, payment_provider
  ) VALUES (
    v_human, auth.uid(), v_subtotal, v_shipping, v_discount, v_total,
    p_payment_method, v_pay_status, v_shipping_label,
    COALESCE(p_address, '{}'::jsonb), p_address->>'phone',
    v_tax,
    CASE WHEN COALESCE(v_settings.gst_enabled, false) THEN COALESCE(v_settings.gst_rate, 0) ELSE 0 END,
    COALESCE(v_settings.prices_include_gst, true),
    v_settings.gstin,
    CASE WHEN v_cod THEN 'cod' ELSE 'razorpay' END
  )
  RETURNING id, orders.human_id, orders.public_token INTO v_order_id, v_human, v_token;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_qty := (v_item->>'qty')::int;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    SELECT url INTO v_image FROM public.product_images
      WHERE product_id = v_product.id ORDER BY sort_order LIMIT 1;
    INSERT INTO public.order_items (order_id, product_id, name_snapshot, price_snapshot, qty, image_snapshot)
      VALUES (v_order_id, v_product.id, v_product.name, v_product.price, v_qty, v_image);
    UPDATE public.products SET stock = stock - v_qty WHERE id = v_product.id;
  END LOOP;

  INSERT INTO public.order_events (order_id, status, note, created_by)
    VALUES (v_order_id, 'order_confirmed',
      CASE WHEN v_cod THEN 'Order placed with cash on delivery' ELSE 'Order created, waiting for payment' END,
      'website');

  RETURN QUERY SELECT v_order_id, v_human, v_token, v_total, v_pay_status::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb, text, text, text) TO anon, authenticated, service_role;
