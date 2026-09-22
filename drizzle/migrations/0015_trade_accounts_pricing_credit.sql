-- ============ enums ============
CREATE TYPE public.customer_type AS ENUM ('retail','trade');
CREATE TYPE public.price_tier AS ENUM ('retail','trade','distributor');
CREATE TYPE public.trade_application_status AS ENUM ('pending','approved','rejected','more_info_needed');
CREATE TYPE public.ledger_kind AS ENUM ('invoice','payment','adjustment');

-- ============ profiles: account type, tier, credit ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS customer_type public.customer_type NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS price_tier public.price_tier NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS trade_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms_days integer NOT NULL DEFAULT 0;

-- A customer may edit their own profile, but never their own tier or credit.
CREATE OR REPLACE FUNCTION public.guard_profile_trade_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    NEW.customer_type := OLD.customer_type;
    NEW.price_tier := OLD.price_tier;
    NEW.trade_approved_at := OLD.trade_approved_at;
    NEW.credit_limit := OLD.credit_limit;
    NEW.payment_terms_days := OLD.payment_terms_days;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER profiles_guard_trade_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_trade_fields();

CREATE OR REPLACE FUNCTION public.customer_tier(_user_id uuid)
RETURNS public.price_tier
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
           WHEN p.customer_type = 'trade' AND p.trade_approved_at IS NOT NULL THEN p.price_tier
           ELSE 'retail'::public.price_tier
         END
  FROM public.profiles p
  WHERE p.id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.is_trade(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.customer_type = 'trade' AND p.trade_approved_at IS NOT NULL
  )
$$;

-- ============ trade applications ============
CREATE TABLE public.trade_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  gstin text,
  pan text,
  shop_address text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  gst_certificate_path text,
  shop_photo_path text,
  address_proof_path text,
  pan_card_path text,
  trade_licence_path text,
  status public.trade_application_status NOT NULL DEFAULT 'pending',
  requested_tier public.price_tier NOT NULL DEFAULT 'trade',
  reviewer text,
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trade_applications_status_idx ON public.trade_applications (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.trade_applications TO authenticated;
GRANT ALL ON public.trade_applications TO service_role;
ALTER TABLE public.trade_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicant reads own application"
  ON public.trade_applications FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Applicant creates own application"
  ON public.trade_applications FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Applicant edits pending application"
  ON public.trade_applications FOR UPDATE TO authenticated
  USING ((profile_id = auth.uid() AND status IN ('pending','more_info_needed')) OR public.is_staff(auth.uid()))
  WITH CHECK ((profile_id = auth.uid() AND status IN ('pending','more_info_needed')) OR public.is_staff(auth.uid()));

CREATE TRIGGER trade_applications_touch
  BEFORE UPDATE ON public.trade_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ price tiers ============
CREATE TABLE public.price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier public.price_tier NOT NULL,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  min_qty integer NOT NULL DEFAULT 1 CHECK (min_qty >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, tier, min_qty)
);
CREATE INDEX price_tiers_lookup_idx ON public.price_tiers (product_id, tier, min_qty DESC);

GRANT SELECT ON public.price_tiers TO authenticated;
GRANT ALL ON public.price_tiers TO service_role;
ALTER TABLE public.price_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage price tiers"
  ON public.price_tiers FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ============ trade rules on products ============
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS trade_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_order_qty integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS order_multiple integer NOT NULL DEFAULT 1;

DROP POLICY "Public read products" ON public.products;
CREATE POLICY "Public read products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    (status = 'visible'::public.product_status AND NOT trade_only)
    OR (status = 'visible'::public.product_status AND public.is_trade(auth.uid()))
    OR public.is_staff(auth.uid())
  );

-- ============ freight + tier on orders ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS price_tier public.price_tier NOT NULL DEFAULT 'retail',
  ADD COLUMN IF NOT EXISTS transport_name text,
  ADD COLUMN IF NOT EXISTS lr_number text,
  ADD COLUMN IF NOT EXISTS credit_due_date date;

-- ============ credit ledger ============
CREATE TABLE public.trade_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  kind public.ledger_kind NOT NULL,
  amount numeric(12,2) NOT NULL,
  note text,
  due_date date,
  settled boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trade_ledger_profile_idx ON public.trade_ledger (profile_id, created_at DESC);

GRANT SELECT ON public.trade_ledger TO authenticated;
GRANT ALL ON public.trade_ledger TO service_role;
ALTER TABLE public.trade_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer reads own ledger"
  ON public.trade_ledger FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Staff write ledger"
  ON public.trade_ledger FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Outstanding balance for a trade account: invoices less payments.
CREATE OR REPLACE FUNCTION public.trade_balance(_profile_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE WHEN kind = 'payment' THEN -amount ELSE amount END
  ), 0)::numeric
  FROM public.trade_ledger WHERE profile_id = _profile_id
$$;

CREATE OR REPLACE FUNCTION public.trade_overdue(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trade_ledger
    WHERE profile_id = _profile_id
      AND kind = 'invoice'
      AND NOT settled
      AND due_date IS NOT NULL
      AND due_date < (now() AT TIME ZONE 'Asia/Kolkata')::date
  )
$$;

-- ============ tier price resolution ============
CREATE OR REPLACE FUNCTION public.tier_price(p_product uuid, p_tier public.price_tier, p_qty integer)
RETURNS numeric
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT pt.price FROM public.price_tiers pt
      WHERE pt.product_id = p_product AND pt.tier = p_tier
        AND pt.min_qty <= GREATEST(COALESCE(p_qty, 1), 1)
      ORDER BY pt.min_qty DESC LIMIT 1),
    (SELECT pt.price FROM public.price_tiers pt
      WHERE pt.product_id = p_product AND pt.tier = 'retail'
        AND pt.min_qty <= GREATEST(COALESCE(p_qty, 1), 1)
      ORDER BY pt.min_qty DESC LIMIT 1),
    (SELECT p.price FROM public.products p WHERE p.id = p_product)
  );
$$;

-- ============ create_order: server-side tier pricing, trade rules, freight ============
DROP FUNCTION IF EXISTS public.create_order(jsonb, jsonb, text, text, text);

CREATE FUNCTION public.create_order(
  p_items jsonb,
  p_address jsonb,
  p_payment_method text,
  p_shipping_code text,
  p_coupon_code text DEFAULT NULL::text,
  p_profile_id uuid DEFAULT NULL::uuid,
  p_transport_name text DEFAULT NULL::text,
  p_lr_number text DEFAULT NULL::text
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
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.';
  END IF;

  v_profile := COALESCE(p_profile_id, auth.uid());
  v_tier := COALESCE(public.customer_tier(v_profile), 'retail'::public.price_tier);
  SELECT COALESCE(credit_limit, 0), COALESCE(payment_terms_days, 0)
    INTO v_limit, v_terms FROM public.profiles WHERE id = v_profile;

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

    v_price := public.tier_price(v_product.id, v_tier, v_qty);
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
    v_price := public.tier_price(v_product.id, v_tier, v_qty);
    SELECT url INTO v_image FROM public.product_images
      WHERE product_id = v_product.id ORDER BY sort_order LIMIT 1;
    INSERT INTO public.order_items (order_id, product_id, name_snapshot, price_snapshot, qty, image_snapshot)
      VALUES (v_order_id, v_product.id, v_product.name, v_price, v_qty, v_image);
    UPDATE public.products SET stock = stock - v_qty WHERE id = v_product.id;
  END LOOP;

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

-- Only the server may create orders: the browser must never choose a price tier.
REVOKE EXECUTE ON FUNCTION public.create_order(jsonb, jsonb, text, text, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb, text, text, text, uuid, text, text) TO service_role;

COMMENT ON FUNCTION public.place_order(jsonb, jsonb, text, text, numeric, text) IS 'DEPRECATED: replaced by create_order';
