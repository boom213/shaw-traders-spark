-- Unguessable public order link + phone for guest verification
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS contact_phone text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_public_token_key ON public.orders(public_token);
UPDATE public.orders SET contact_phone = address->>'phone' WHERE contact_phone IS NULL;

-- Cross-device cart / wishlist / saved / recently viewed for signed-in customers
CREATE TABLE IF NOT EXISTS public.user_lists (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cart jsonb NOT NULL DEFAULT '[]'::jsonb,
  wishlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  saved jsonb NOT NULL DEFAULT '[]'::jsonb,
  recently_viewed jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_lists TO authenticated;
GRANT ALL ON public.user_lists TO service_role;

ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own lists" ON public.user_lists FOR ALL TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE TRIGGER user_lists_touch BEFORE UPDATE ON public.user_lists
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helpful lookup indexes
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS products_active_idx ON public.products(is_active);
CREATE INDEX IF NOT EXISTS orders_placed_at_idx ON public.orders(placed_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS compat_model_idx ON public.product_compatibility(vehicle_model);

-- Atomic order placement with stock enforcement
CREATE OR REPLACE FUNCTION public.place_order(
  p_items jsonb,
  p_address jsonb,
  p_payment_method text,
  p_shipping_method text,
  p_shipping_fee numeric DEFAULT 0,
  p_coupon_code text DEFAULT NULL
)
RETURNS TABLE (order_id uuid, human_id text, public_token uuid)
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
  v_order_id uuid;
  v_human text;
  v_token uuid;
  v_coupon public.coupons%ROWTYPE;
  v_image text;
  v_attempt int := 0;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  -- Validate stock and compute totals with the rows locked
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::int, 1));
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND OR NOT v_product.is_active THEN
      RAISE EXCEPTION 'A product in your cart is no longer available.';
    END IF;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Only % left of %', v_product.stock, v_product.name;
    END IF;
    v_subtotal := v_subtotal + COALESCE(v_product.price, 0) * v_qty;
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

  LOOP
    v_attempt := v_attempt + 1;
    v_human := 'STE-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD') || '-' ||
               lpad(floor(random() * 10000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.human_id = v_human) OR v_attempt > 25;
  END LOOP;

  INSERT INTO public.orders (
    human_id, profile_id, subtotal, shipping_fee, discount, total,
    payment_method, payment_status, shipping_method, address, contact_phone
  ) VALUES (
    v_human, auth.uid(), v_subtotal, COALESCE(p_shipping_fee, 0), v_discount,
    GREATEST(0, v_subtotal - v_discount + COALESCE(p_shipping_fee, 0)),
    p_payment_method,
    CASE WHEN p_payment_method ILIKE '%cash%' THEN 'cod_pending'::public.payment_status
         ELSE 'pending'::public.payment_status END,
    p_shipping_method, COALESCE(p_address, '{}'::jsonb), p_address->>'phone'
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
    VALUES (v_order_id, 'order_confirmed', 'Order placed on the website', 'website');

  RETURN QUERY SELECT v_order_id, v_human, v_token;
END;
$$;

REVOKE ALL ON FUNCTION public.place_order(jsonb, jsonb, text, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb, jsonb, text, text, numeric, text) TO anon, authenticated, service_role;
