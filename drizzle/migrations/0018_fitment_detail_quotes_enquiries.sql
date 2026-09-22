-- Fitment detail: year range and variant where the shop knows it.
ALTER TABLE public.product_compatibility
  ADD COLUMN IF NOT EXISTS year_from integer,
  ADD COLUMN IF NOT EXISTS year_to integer,
  ADD COLUMN IF NOT EXISTS variant text;

-- Enquiries gain the customer's vehicle, where they came from, a photo of the
-- broken part, and the one-tap staff reply (quote / out of stock / alternative).
ALTER TABLE public.product_enquiries
  ADD COLUMN IF NOT EXISTS vehicle text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS reply text,
  ADD COLUMN IF NOT EXISTS replied_at timestamptz,
  ADD COLUMN IF NOT EXISTS expected_date date,
  ADD COLUMN IF NOT EXISTS alternative_product_id uuid REFERENCES public.products(id),
  ADD COLUMN IF NOT EXISTS quoted_price numeric,
  ADD COLUMN IF NOT EXISTS quote_token uuid,
  ADD COLUMN IF NOT EXISTS quote_expires_at timestamptz;

ALTER TABLE public.product_enquiries ALTER COLUMN product_name DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_enquiries_quote_token_idx
  ON public.product_enquiries (quote_token) WHERE quote_token IS NOT NULL;

-- A quote link the customer can open without signing in.
CREATE OR REPLACE FUNCTION public.quote_by_token(p_token uuid)
RETURNS TABLE(
  enquiry_id uuid,
  product_id uuid,
  product_name text,
  product_slug text,
  image_url text,
  qty integer,
  unit_price numeric,
  expires_at timestamptz,
  spent boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.id,
         e.product_id,
         COALESCE(p.name, e.product_name),
         p.slug,
         (SELECT pi.url FROM public.product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1),
         e.qty,
         e.quoted_price,
         e.quote_expires_at,
         (e.status = 'ordered')
  FROM public.product_enquiries e
  JOIN public.products p ON p.id = e.product_id
  WHERE e.quote_token = p_token
    AND e.quoted_price IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.quote_by_token(uuid) TO anon, authenticated, service_role;

-- create_order gains an optional quote token. When it is valid the quoted
-- price replaces the tier price for that one product, on the server only.
CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,
  p_address jsonb,
  p_payment_method text,
  p_shipping_code text,
  p_coupon_code text DEFAULT NULL::text,
  p_profile_id uuid DEFAULT NULL::uuid,
  p_transport_name text DEFAULT NULL::text,
  p_lr_number text DEFAULT NULL::text,
  p_quote_token uuid DEFAULT NULL::uuid
)
 RETURNS TABLE(order_id uuid, human_id text, public_token uuid, total numeric, payment_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty int;
  v_price numeric;
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
  v_credit boolean;
  v_pay_status public.payment_status;
  v_pincode text;
  v_profile uuid;
  v_tier public.price_tier;
  v_terms int := 0;
  v_limit numeric := 0;
  v_quote public.product_enquiries%ROWTYPE;
  v_quote_product uuid;
  v_quote_price numeric;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  v_profile := COALESCE(p_profile_id, auth.uid());
  v_tier := COALESCE(public.customer_tier(v_profile), 'retail'::public.price_tier);
  SELECT COALESCE(credit_limit, 0), COALESCE(payment_terms_days, 0)
    INTO v_limit, v_terms FROM public.profiles WHERE id = v_profile;

  IF p_quote_token IS NOT NULL THEN
    SELECT * INTO v_quote FROM public.product_enquiries
      WHERE quote_token = p_quote_token FOR UPDATE;
    IF NOT FOUND OR v_quote.quoted_price IS NULL THEN
      RAISE EXCEPTION 'This quote link is not valid.';
    END IF;
    IF v_quote.status = 'ordered' THEN
      RAISE EXCEPTION 'This quote has already been used.';
    END IF;
    IF v_quote.quote_expires_at IS NOT NULL AND v_quote.quote_expires_at < now() THEN
      RAISE EXCEPTION 'This quote has expired. Please ask us for a fresh price.';
    END IF;
    v_quote_product := v_quote.product_id;
    v_quote_price := v_quote.quoted_price;
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
  v_credit := p_payment_method ILIKE '%credit%';
  v_pincode := COALESCE(p_address->>'pincode', '');

  IF p_shipping_code = 'express' THEN
    v_shipping := 120; v_shipping_label := 'Express Delivery (1-3 working days)';
  ELSIF p_shipping_code = 'pickup' THEN
    v_shipping := 0; v_shipping_label := 'Pickup at Bud Bud counter (ready in 2 hours)';
  ELSIF p_shipping_code = 'freight' THEN
    v_shipping := 0; v_shipping_label := 'Transport / freight (paid to transporter)';
  ELSE
    v_shipping := 0; v_shipping_label := 'Standard Delivery (3-6 working days)';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_qty := (v_item->>'qty')::int;
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND OR v_product.status <> 'visible' THEN
      RAISE EXCEPTION 'A product in your cart is no longer available.';
    END IF;
    IF v_product.trade_only AND v_tier = 'retail' THEN
      RAISE EXCEPTION 'A product in your cart is no longer available.';
    END IF;
    IF v_tier <> 'retail' THEN
      IF v_qty < GREATEST(COALESCE(v_product.min_order_qty, 1), 1) THEN
        RAISE EXCEPTION 'Trade orders for % start at % pieces', v_product.name, v_product.min_order_qty;
      END IF;
      IF COALESCE(v_product.order_multiple, 1) > 1
         AND v_qty % v_product.order_multiple <> 0 THEN
        RAISE EXCEPTION '% is sold in multiples of %', v_product.name, v_product.order_multiple;
      END IF;
    END IF;

    IF v_quote_product IS NOT NULL AND v_product.id = v_quote_product THEN
      v_price := v_quote_price;
    ELSE
      v_price := public.tier_price(v_product.id, v_tier, v_qty);
    END IF;
    IF COALESCE(v_price, 0) <= 0 THEN
      RAISE EXCEPTION 'Please contact us for the price of %', v_product.name;
    END IF;
    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'Only % left of %', v_product.stock, v_product.name;
    END IF;
    v_subtotal := v_subtotal + v_price * v_qty;
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

  IF v_credit THEN
    IF v_tier = 'retail' OR v_profile IS NULL THEN
      RAISE EXCEPTION 'Credit is only available to approved trade accounts.';
    END IF;
    IF public.trade_overdue(v_profile) THEN
      RAISE EXCEPTION 'An earlier invoice is overdue. Please clear it before ordering on credit.';
    END IF;
    IF public.trade_balance(v_profile) + v_total > v_limit THEN
      RAISE EXCEPTION 'This order goes past your credit limit. Please pay online or clear the balance.';
    END IF;
    v_pay_status := 'cod_pending';
  ELSIF v_cod THEN
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
    tax_amount, gst_rate, gst_included, gstin, payment_provider,
    price_tier, transport_name, lr_number, credit_due_date
  ) VALUES (
    v_human, v_profile, v_subtotal, v_shipping, v_discount, v_total,
    p_payment_method, v_pay_status, v_shipping_label,
    COALESCE(p_address, '{}'::jsonb), p_address->>'phone',
    v_tax,
    CASE WHEN COALESCE(v_settings.gst_enabled, false) THEN COALESCE(v_settings.gst_rate, 0) ELSE 0 END,
    COALESCE(v_settings.prices_include_gst, true),
    v_settings.gstin,
    CASE WHEN v_credit THEN 'credit' WHEN v_cod THEN 'cod' ELSE 'razorpay' END,
    v_tier,
    nullif(trim(coalesce(p_transport_name, '')), ''),
    nullif(trim(coalesce(p_lr_number, '')), ''),
    CASE WHEN v_credit THEN ((now() AT TIME ZONE 'Asia/Kolkata')::date + v_terms) ELSE NULL END
  )
  RETURNING id, orders.human_id, orders.public_token INTO v_order_id, v_human, v_token;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_qty := (v_item->>'qty')::int;
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    IF v_quote_product IS NOT NULL AND v_product.id = v_quote_product THEN
      v_price := v_quote_price;
    ELSE
      v_price := public.tier_price(v_product.id, v_tier, v_qty);
    END IF;
    SELECT url INTO v_image FROM public.product_images
      WHERE product_id = v_product.id ORDER BY sort_order LIMIT 1;
    INSERT INTO public.order_items (order_id, product_id, name_snapshot, price_snapshot, qty, image_snapshot)
      VALUES (v_order_id, v_product.id, v_product.name, v_price, v_qty, v_image);
    UPDATE public.products SET stock = stock - v_qty WHERE id = v_product.id;
  END LOOP;

  IF v_quote_product IS NOT NULL THEN
    UPDATE public.product_enquiries
      SET status = 'ordered', handled_by = COALESCE(handled_by, 'website')
      WHERE id = v_quote.id;
  END IF;

  IF v_credit THEN
    INSERT INTO public.trade_ledger (profile_id, order_id, kind, amount, note, due_date, created_by)
      VALUES (v_profile, v_order_id, 'invoice', v_total, 'Order ' || v_human,
              (now() AT TIME ZONE 'Asia/Kolkata')::date + v_terms, 'website');
  END IF;

  INSERT INTO public.order_events (order_id, status, note, created_by)
    VALUES (v_order_id, 'order_confirmed',
      CASE WHEN v_credit THEN 'Order placed on credit'
           WHEN v_cod THEN 'Order placed with cash on delivery'
           ELSE 'Order created, waiting for payment' END,
      'website');

  RETURN QUERY SELECT v_order_id, v_human, v_token, v_total, v_pay_status::text;
END;
$function$;
