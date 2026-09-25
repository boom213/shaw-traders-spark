CREATE TABLE public.counter_sales (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  invoice_kind text NOT NULL CHECK (invoice_kind IN ('gst', 'non_gst')),
  price_override_reason text,
  note text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_by_name text NOT NULL,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.counter_sales TO authenticated;
GRANT ALL ON public.counter_sales TO service_role;
ALTER TABLE public.counter_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read counter sales" ON public.counter_sales FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.counter_sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  method text NOT NULL,
  reference text,
  note text,
  received_on date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  recorded_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.counter_sale_payments TO authenticated;
GRANT ALL ON public.counter_sale_payments TO service_role;
ALTER TABLE public.counter_sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read counter sale payments" ON public.counter_sale_payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX counter_sale_payments_order_idx ON public.counter_sale_payments(order_id, created_at);
CREATE INDEX counter_sales_profile_idx ON public.counter_sales(profile_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_counter_sale(
  p_profile_id uuid,
  p_items jsonb,
  p_invoice_kind text,
  p_override_reason text,
  p_note text,
  p_actor_id uuid,
  p_actor_name text
) RETURNS TABLE(order_id uuid, human_id text, public_token uuid, total numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_address jsonb := '{}'::jsonb;
  v_settings public.shop_settings%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty integer;
  v_unit numeric;
  v_expected numeric;
  v_subtotal numeric := 0;
  v_tax numeric := 0;
  v_total numeric := 0;
  v_order_id uuid;
  v_human text;
  v_token uuid;
  v_attempt integer := 0;
  v_image text;
  v_has_override boolean := false;
  v_due date;
BEGIN
  IF p_invoice_kind NOT IN ('gst', 'non_gst') THEN RAISE EXCEPTION 'Choose GST invoice or non-GST bill.'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Add at least one product.'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  IF NOT FOUND OR v_profile.customer_type <> 'trade' OR v_profile.trade_approved_at IS NULL THEN
    RAISE EXCEPTION 'Only approved wholesale customers can use counter sales.';
  END IF;
  SELECT to_jsonb(a) - 'id' - 'profile_id' - 'created_at' INTO v_address
    FROM public.addresses a WHERE a.profile_id = p_profile_id ORDER BY a.is_default DESC, a.created_at DESC LIMIT 1;
  v_address := COALESCE(v_address, '{}'::jsonb) || jsonb_build_object('name', COALESCE(v_profile.full_name, ''), 'phone', COALESCE(v_profile.phone, ''), 'email', COALESCE(v_profile.email, ''));
  SELECT * INTO v_settings FROM public.shop_settings WHERE id LIMIT 1;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::integer, 1));
    v_unit := round(COALESCE((v_item->>'unit_price')::numeric, 0), 2);
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND OR v_product.status <> 'visible' THEN RAISE EXCEPTION 'A selected product is no longer available.'; END IF;
    IF v_product.stock < v_qty THEN RAISE EXCEPTION 'Only % left of %.', v_product.stock, v_product.name; END IF;
    v_expected := public.tier_price(v_product.id, v_profile.price_tier, v_qty);
    IF v_unit <= 0 THEN RAISE EXCEPTION 'Enter a valid price for %.', v_product.name; END IF;
    IF abs(v_unit - COALESCE(v_expected, 0)) > 0.009 THEN v_has_override := true; END IF;
    v_subtotal := v_subtotal + v_unit * v_qty;
  END LOOP;
  IF v_has_override AND length(trim(COALESCE(p_override_reason, ''))) < 3 THEN RAISE EXCEPTION 'Add a reason for the price change.'; END IF;

  IF p_invoice_kind = 'gst' AND COALESCE(v_settings.gst_enabled, false) THEN
    IF COALESCE(v_settings.prices_include_gst, true) THEN
      v_total := v_subtotal;
      v_tax := round(v_subtotal * COALESCE(v_settings.gst_rate, 0) / (100 + COALESCE(v_settings.gst_rate, 0)), 2);
    ELSE
      v_tax := round(v_subtotal * COALESCE(v_settings.gst_rate, 0) / 100, 2);
      v_total := v_subtotal + v_tax;
    END IF;
  ELSE
    v_total := v_subtotal;
  END IF;
  v_due := (now() AT TIME ZONE 'Asia/Kolkata')::date + COALESCE(v_profile.payment_terms_days, 0);

  LOOP
    v_attempt := v_attempt + 1;
    v_human := 'CS-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD') || '-' || lpad(floor(random() * 10000)::integer::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE orders.human_id = v_human) OR v_attempt > 25;
  END LOOP;

  INSERT INTO public.orders (human_id, profile_id, status, subtotal, shipping_fee, discount, total, payment_method, payment_status, shipping_method, address, contact_phone, tax_amount, gst_rate, gst_included, gstin, payment_provider, price_tier, credit_due_date)
  VALUES (v_human, p_profile_id, 'delivered', v_subtotal, 0, 0, v_total, 'Offline credit', 'cod_pending', 'In-house counter sale', v_address, v_profile.phone, v_tax,
    CASE WHEN p_invoice_kind = 'gst' THEN COALESCE(v_settings.gst_rate, 0) ELSE 0 END,
    COALESCE(v_settings.prices_include_gst, true), CASE WHEN p_invoice_kind = 'gst' THEN v_settings.gstin ELSE NULL END,
    'counter_sale', v_profile.price_tier, v_due)
  RETURNING id, orders.public_token INTO v_order_id, v_token;

  INSERT INTO public.counter_sales(order_id, profile_id, invoice_kind, price_override_reason, note, created_by, created_by_name)
  VALUES (v_order_id, p_profile_id, p_invoice_kind, nullif(trim(COALESCE(p_override_reason, '')), ''), nullif(trim(COALESCE(p_note, '')), ''), p_actor_id, p_actor_name);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::integer, 1));
    v_unit := round((v_item->>'unit_price')::numeric, 2);
    SELECT * INTO v_product FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    SELECT url INTO v_image FROM public.product_images WHERE product_id = v_product.id ORDER BY sort_order LIMIT 1;
    INSERT INTO public.order_items(order_id, product_id, name_snapshot, price_snapshot, qty, image_snapshot)
    VALUES (v_order_id, v_product.id, v_product.name, v_unit, v_qty, v_image);
    UPDATE public.products SET stock = stock - v_qty WHERE id = v_product.id;
  END LOOP;

  INSERT INTO public.trade_ledger(profile_id, order_id, kind, amount, note, due_date, created_by)
  VALUES (p_profile_id, v_order_id, 'invoice', v_total, 'Counter sale ' || v_human, v_due, p_actor_name);
  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (v_order_id, 'delivered', 'In-house wholesale counter sale created on offline credit', p_actor_name);
  RETURN QUERY SELECT v_order_id, v_human, v_token, v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.create_counter_sale(uuid,jsonb,text,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_counter_sale(uuid,jsonb,text,text,text,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_counter_sale_payment(
  p_order_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_note text,
  p_received_on date,
  p_actor_id uuid,
  p_actor_name text
) RETURNS numeric
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sale public.counter_sales%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_paid numeric;
  v_balance numeric;
BEGIN
  SELECT * INTO v_sale FROM public.counter_sales WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_sale.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'This counter sale is not open.'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM public.counter_sale_payments WHERE order_id = p_order_id;
  v_balance := v_order.total - v_paid;
  IF p_amount <= 0 OR p_amount > v_balance + 0.009 THEN RAISE EXCEPTION 'Payment must be more than zero and no more than the remaining balance.'; END IF;
  INSERT INTO public.counter_sale_payments(order_id, amount, method, reference, note, received_on, recorded_by, recorded_by_name)
  VALUES (p_order_id, round(p_amount, 2), trim(p_method), nullif(trim(COALESCE(p_reference, '')), ''), nullif(trim(COALESCE(p_note, '')), ''), COALESCE(p_received_on, CURRENT_DATE), p_actor_id, p_actor_name);
  INSERT INTO public.trade_ledger(profile_id, order_id, kind, amount, note, due_date, created_by)
  VALUES (v_sale.profile_id, p_order_id, 'payment', round(p_amount, 2), 'Payment for ' || v_order.human_id || ' · ' || trim(p_method), COALESCE(p_received_on, CURRENT_DATE), p_actor_name);
  v_balance := round(v_balance - p_amount, 2);
  IF v_balance <= 0.009 THEN
    UPDATE public.orders SET payment_status = 'paid' WHERE id = p_order_id;
    UPDATE public.trade_ledger SET settled = true WHERE order_id = p_order_id AND kind = 'invoice';
  END IF;
  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (p_order_id, v_order.status, 'Offline payment received: ' || round(p_amount, 2)::text || ' via ' || trim(p_method), p_actor_name);
  RETURN GREATEST(v_balance, 0);
END;
$$;
REVOKE ALL ON FUNCTION public.record_counter_sale_payment(uuid,numeric,text,text,text,date,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_counter_sale_payment(uuid,numeric,text,text,text,date,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_counter_sale(
  p_order_id uuid,
  p_reason text,
  p_actor_id uuid,
  p_actor_name text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sale public.counter_sales%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_item public.order_items%ROWTYPE;
  v_paid numeric;
BEGIN
  SELECT * INTO v_sale FROM public.counter_sales WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_sale.cancelled_at IS NOT NULL THEN RETURN false; END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM public.counter_sale_payments WHERE order_id = p_order_id;
  IF v_paid > 0 THEN RAISE EXCEPTION 'A sale with recorded payments cannot be cancelled.'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id LOOP
    IF v_item.product_id IS NOT NULL THEN UPDATE public.products SET stock = stock + v_item.qty WHERE id = v_item.product_id; END IF;
  END LOOP;
  UPDATE public.counter_sales SET cancelled_at = now(), cancelled_by = p_actor_id, cancel_reason = trim(p_reason) WHERE order_id = p_order_id;
  UPDATE public.orders SET status = 'cancelled', payment_status = 'failed', stock_released = true, cancel_reason = trim(p_reason) WHERE id = p_order_id;
  UPDATE public.trade_ledger SET settled = true WHERE order_id = p_order_id AND kind = 'invoice';
  INSERT INTO public.trade_ledger(profile_id, order_id, kind, amount, note, due_date, settled, created_by)
  VALUES (v_sale.profile_id, p_order_id, 'payment', v_order.total, 'Counter sale cancelled: ' || trim(p_reason), CURRENT_DATE, true, p_actor_name);
  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (p_order_id, 'cancelled', 'Counter sale cancelled: ' || trim(p_reason), p_actor_name);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_counter_sale(uuid,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_counter_sale(uuid,text,uuid,text) TO service_role;