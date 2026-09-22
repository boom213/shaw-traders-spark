-- Shop-wide settings the owner controls (GST, COD rules)
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id boolean PRIMARY KEY DEFAULT true,
  gst_enabled boolean NOT NULL DEFAULT true,
  gst_rate numeric NOT NULL DEFAULT 18,
  prices_include_gst boolean NOT NULL DEFAULT true,
  gstin text,
  legal_name text,
  billing_address text,
  cod_enabled boolean NOT NULL DEFAULT true,
  cod_limit numeric NOT NULL DEFAULT 2000,
  cod_pincodes text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shop_settings_single_row CHECK (id)
);

GRANT SELECT ON public.shop_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read shop settings" ON public.shop_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff write shop settings" ON public.shop_settings
  FOR ALL TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));

CREATE TRIGGER shop_settings_touch BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Payment + tax details on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gst_rate numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gst_included boolean NOT NULL DEFAULT true;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS gstin text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_order_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_released boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS orders_provider_order_id_idx ON public.orders (provider_order_id);

-- Idempotency log for payment provider callbacks
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'razorpay',
  event_id text NOT NULL,
  event_type text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Create an order entirely from server-side prices, reserving stock atomically.
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

  SELECT * INTO v_settings FROM public.shop_settings WHERE id LIMIT 1;

  v_cod := p_payment_method ILIKE '%cash%';
  v_pincode := COALESCE(p_address->>'pincode', '');

  -- Server-side shipping prices
  IF p_shipping_code = 'express' THEN
    v_shipping := 120; v_shipping_label := 'Express Delivery (1-3 working days)';
  ELSIF p_shipping_code = 'pickup' THEN
    v_shipping := 0; v_shipping_label := 'Pickup at Bud Bud counter (ready in 2 hours)';
  ELSE
    v_shipping := 0; v_shipping_label := 'Standard Delivery (3-6 working days)';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::int, 1));
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

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::int, 1));
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

-- Mark an order paid exactly once.
CREATE OR REPLACE FUNCTION public.mark_order_paid(p_order_id uuid, p_payment_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_status public.payment_status;
BEGIN
  SELECT payment_status INTO v_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_status = 'paid' THEN RETURN false; END IF;

  UPDATE public.orders
    SET payment_status = 'paid',
        provider_payment_id = p_payment_id,
        status = CASE WHEN status = 'order_confirmed' THEN 'processing'::public.order_status ELSE status END
    WHERE id = p_order_id;

  INSERT INTO public.order_events (order_id, status, note, created_by)
    VALUES (p_order_id, 'processing', 'Payment received', 'razorpay');
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_order_paid(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid, text) TO service_role;

-- Put reserved stock back when a payment fails, is cancelled, or times out.
CREATE OR REPLACE FUNCTION public.release_order(p_order_id uuid, p_reason text DEFAULT 'Payment not completed')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_order.payment_status <> 'pending' OR v_order.stock_released THEN RETURN false; END IF;

  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE public.products SET stock = stock + v_item.qty WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE public.orders
    SET payment_status = 'failed', status = 'cancelled', stock_released = true
    WHERE id = p_order_id;

  INSERT INTO public.order_events (order_id, status, note, created_by)
    VALUES (p_order_id, 'cancelled', p_reason, 'website');
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_order(uuid, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_order(uuid, text) TO service_role;

-- Recompute GST on a single order (owner decides per order).
CREATE OR REPLACE FUNCTION public.set_order_gst(p_order_id uuid, p_enabled boolean, p_rate numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_base numeric;
  v_tax numeric := 0;
  v_total numeric;
  v_gstin text;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT gstin INTO v_gstin FROM public.shop_settings WHERE id LIMIT 1;

  v_base := GREATEST(0, v_order.subtotal - v_order.discount + v_order.shipping_fee);
  v_total := v_base;

  IF p_enabled THEN
    IF v_order.gst_included THEN
      v_tax := round(v_base * p_rate / (100 + p_rate), 2);
    ELSE
      v_tax := round(v_base * p_rate / 100, 2);
      v_total := v_base + v_tax;
    END IF;
  END IF;

  UPDATE public.orders
    SET tax_amount = v_tax,
        gst_rate = CASE WHEN p_enabled THEN p_rate ELSE 0 END,
        gstin = CASE WHEN p_enabled THEN v_gstin ELSE NULL END,
        total = v_total
    WHERE id = p_order_id;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_order_gst(uuid, boolean, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_order_gst(uuid, boolean, numeric) TO service_role;

COMMENT ON FUNCTION public.place_order(jsonb, jsonb, text, text, numeric, text) IS 'DEPRECATED: replaced by public.create_order, which prices the order server-side and handles GST and COD rules.';
