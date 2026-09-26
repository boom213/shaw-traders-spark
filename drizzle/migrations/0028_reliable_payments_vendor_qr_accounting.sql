CREATE TYPE public.trade_payment_method AS ENUM ('cash', 'upi_qr', 'bank_transfer', 'wholesaler_adjustment', 'other');

ALTER TABLE public.trade_ledger
  ADD COLUMN method public.trade_payment_method NOT NULL DEFAULT 'other',
  ADD COLUMN reference text,
  ADD COLUMN received_on date NOT NULL DEFAULT CURRENT_DATE;

ALTER TABLE public.trade_ledger
  ADD CONSTRAINT trade_ledger_amount_nonzero CHECK (amount <> 0) NOT VALID,
  ADD CONSTRAINT trade_ledger_signed_adjustment CHECK (kind = 'adjustment' OR amount > 0) NOT VALID,
  ADD CONSTRAINT trade_ledger_reference_required CHECK (
    method NOT IN ('upi_qr', 'bank_transfer', 'wholesaler_adjustment')
    OR length(trim(COALESCE(reference, note, ''))) > 0
  ) NOT VALID;

ALTER TABLE public.counter_sales ADD COLUMN created_by_email text;

CREATE TABLE public.qr_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  qr_image_path text NOT NULL,
  upi_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qr_vendors_name_nonempty CHECK (length(trim(name)) >= 2)
);
GRANT SELECT ON public.qr_vendors TO authenticated;
GRANT ALL ON public.qr_vendors TO service_role;
ALTER TABLE public.qr_vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read QR vendors" ON public.qr_vendors
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX qr_vendors_active_name_idx ON public.qr_vendors(active, name);
CREATE TRIGGER qr_vendors_touch_updated_at BEFORE UPDATE ON public.qr_vendors
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.qr_vendors(id),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  note text,
  linked_ledger_id uuid UNIQUE REFERENCES public.trade_ledger(id),
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  created_by_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendor_payments TO authenticated;
GRANT ALL ON public.vendor_payments TO service_role;
ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read vendor payments" ON public.vendor_payments
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX vendor_payments_vendor_date_idx ON public.vendor_payments(vendor_id, paid_on DESC, created_at DESC);
CREATE INDEX vendor_payments_date_idx ON public.vendor_payments(paid_on DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.record_trade_ledger_entry(
  p_profile_id uuid,
  p_kind public.ledger_kind,
  p_amount numeric,
  p_method public.trade_payment_method,
  p_reference text,
  p_note text,
  p_received_on date,
  p_due_date date,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_email text,
  p_vendor_id uuid DEFAULT NULL
) RETURNS TABLE(ledger_id uuid, vendor_payment_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ledger_id uuid;
  v_vendor_payment_id uuid;
  v_left numeric;
  v_invoice public.trade_ledger%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wholesale customer not found.'; END IF;
  IF p_kind <> 'adjustment' AND p_amount <= 0 THEN RAISE EXCEPTION 'Enter an amount greater than zero.'; END IF;
  IF p_kind = 'adjustment' AND p_amount = 0 THEN RAISE EXCEPTION 'Adjustment cannot be zero.'; END IF;
  IF p_method IN ('upi_qr', 'bank_transfer', 'wholesaler_adjustment')
     AND length(trim(COALESCE(p_reference, p_note, ''))) = 0 THEN
    RAISE EXCEPTION 'Add a reference or explanation for this payment method.';
  END IF;
  IF p_vendor_id IS NOT NULL THEN
    IF p_kind <> 'payment' OR p_method <> 'upi_qr' THEN RAISE EXCEPTION 'A vendor can only be linked to a UPI QR payment.'; END IF;
    PERFORM 1 FROM public.qr_vendors WHERE id = p_vendor_id AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active vendor.'; END IF;
  END IF;

  INSERT INTO public.trade_ledger(profile_id, kind, amount, method, reference, note, received_on, due_date, created_by)
  VALUES (p_profile_id, p_kind, round(p_amount, 2), COALESCE(p_method, 'other'), nullif(trim(COALESCE(p_reference, '')), ''), nullif(trim(COALESCE(p_note, '')), ''), COALESCE(p_received_on, CURRENT_DATE), p_due_date, p_actor_name)
  RETURNING id INTO v_ledger_id;

  IF p_kind = 'payment' THEN
    v_left := p_amount;
    FOR v_invoice IN
      SELECT * FROM public.trade_ledger
      WHERE profile_id = p_profile_id AND kind = 'invoice' AND NOT settled
      ORDER BY created_at ASC FOR UPDATE
    LOOP
      EXIT WHEN v_left < v_invoice.amount;
      v_left := v_left - v_invoice.amount;
      UPDATE public.trade_ledger SET settled = true WHERE id = v_invoice.id;
    END LOOP;
  END IF;

  IF p_vendor_id IS NOT NULL THEN
    INSERT INTO public.vendor_payments(vendor_id, amount, paid_on, reference, note, linked_ledger_id, created_by, created_by_name, created_by_email)
    VALUES (p_vendor_id, round(p_amount, 2), COALESCE(p_received_on, CURRENT_DATE), nullif(trim(COALESCE(p_reference, '')), ''), nullif(trim(COALESCE(p_note, '')), ''), v_ledger_id, p_actor_id, p_actor_name, p_actor_email)
    RETURNING id INTO v_vendor_payment_id;
  END IF;

  RETURN QUERY SELECT v_ledger_id, v_vendor_payment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_trade_ledger_entry(uuid,public.ledger_kind,numeric,public.trade_payment_method,text,text,date,date,uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_trade_ledger_entry(uuid,public.ledger_kind,numeric,public.trade_payment_method,text,text,date,date,uuid,text,text,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.record_vendor_payment(
  p_vendor_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_reference text,
  p_note text,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_email text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_payment_id uuid;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Enter an amount greater than zero.'; END IF;
  PERFORM 1 FROM public.qr_vendors WHERE id = p_vendor_id AND active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active vendor.'; END IF;
  INSERT INTO public.vendor_payments(vendor_id, amount, paid_on, reference, note, created_by, created_by_name, created_by_email)
  VALUES (p_vendor_id, round(p_amount, 2), COALESCE(p_paid_on, CURRENT_DATE), nullif(trim(COALESCE(p_reference, '')), ''), nullif(trim(COALESCE(p_note, '')), ''), p_actor_id, p_actor_name, p_actor_email)
  RETURNING id INTO v_payment_id;
  RETURN v_payment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_vendor_payment(uuid,numeric,date,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_vendor_payment(uuid,numeric,date,text,text,uuid,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_order_paid(p_order_id uuid, p_payment_id text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_order.payment_status = 'paid' THEN RETURN false; END IF;
  IF v_order.status = 'cancelled' OR v_order.stock_released THEN
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
    SET payment_status = 'paid', provider_payment_id = p_payment_id,
        status = CASE WHEN status = 'order_confirmed' THEN 'processing'::public.order_status ELSE status END
    WHERE id = p_order_id;
  INSERT INTO public.order_events(order_id, status, note, created_by)
  VALUES (p_order_id, 'processing', 'Payment received', 'razorpay');
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_order_paid(uuid,text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_counter_sale(
  p_profile_id uuid,
  p_items jsonb,
  p_invoice_kind text,
  p_override_reason text,
  p_note text,
  p_actor_id uuid,
  p_actor_name text,
  p_actor_email text
) RETURNS TABLE(order_id uuid, human_id text, public_token uuid, total numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles%ROWTYPE; v_address jsonb := '{}'::jsonb; v_settings public.shop_settings%ROWTYPE;
  v_item jsonb; v_product public.products%ROWTYPE; v_qty integer; v_unit numeric; v_expected numeric;
  v_subtotal numeric := 0; v_tax numeric := 0; v_total numeric := 0; v_order_id uuid; v_human text;
  v_token uuid; v_attempt integer := 0; v_image text; v_has_override boolean := false; v_due date;
BEGIN
  IF p_invoice_kind NOT IN ('gst', 'non_gst') THEN RAISE EXCEPTION 'Choose GST invoice or non-GST bill.'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Add at least one product.'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  IF NOT FOUND OR v_profile.customer_type <> 'trade' OR v_profile.trade_approved_at IS NULL THEN RAISE EXCEPTION 'Only approved wholesale customers can use counter sales.'; END IF;
  SELECT to_jsonb(a) - 'id' - 'profile_id' - 'created_at' INTO v_address FROM public.addresses a WHERE a.profile_id = p_profile_id ORDER BY a.is_default DESC, a.created_at DESC LIMIT 1;
  v_address := COALESCE(v_address, '{}'::jsonb) || jsonb_build_object('name', COALESCE(v_profile.full_name, ''), 'phone', COALESCE(v_profile.phone, ''), 'email', COALESCE(v_profile.email, ''));
  SELECT * INTO v_settings FROM public.shop_settings WHERE id LIMIT 1;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::integer, 1)); v_unit := round(COALESCE((v_item->>'unit_price')::numeric, 0), 2);
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
    IF COALESCE(v_settings.prices_include_gst, true) THEN v_total := v_subtotal; v_tax := round(v_subtotal * COALESCE(v_settings.gst_rate, 0) / (100 + COALESCE(v_settings.gst_rate, 0)), 2);
    ELSE v_tax := round(v_subtotal * COALESCE(v_settings.gst_rate, 0) / 100, 2); v_total := v_subtotal + v_tax; END IF;
  ELSE v_total := v_subtotal; END IF;
  v_due := (now() AT TIME ZONE 'Asia/Kolkata')::date + COALESCE(v_profile.payment_terms_days, 0);
  LOOP v_attempt := v_attempt + 1; v_human := 'CS-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD') || '-' || lpad(floor(random() * 10000)::integer::text, 4, '0'); EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE orders.human_id = v_human) OR v_attempt > 25; END LOOP;
  INSERT INTO public.orders(human_id,profile_id,status,subtotal,shipping_fee,discount,total,payment_method,payment_status,shipping_method,address,contact_phone,tax_amount,gst_rate,gst_included,gstin,payment_provider,price_tier,credit_due_date)
  VALUES(v_human,p_profile_id,'delivered',v_subtotal,0,0,v_total,'Offline credit','cod_pending','In-house counter sale',v_address,v_profile.phone,v_tax,CASE WHEN p_invoice_kind='gst' THEN COALESCE(v_settings.gst_rate,0) ELSE 0 END,COALESCE(v_settings.prices_include_gst,true),CASE WHEN p_invoice_kind='gst' THEN v_settings.gstin ELSE NULL END,'counter_sale',v_profile.price_tier,v_due)
  RETURNING id,orders.public_token INTO v_order_id,v_token;
  INSERT INTO public.counter_sales(order_id,profile_id,invoice_kind,price_override_reason,note,created_by,created_by_name,created_by_email)
  VALUES(v_order_id,p_profile_id,p_invoice_kind,nullif(trim(COALESCE(p_override_reason,'')),''),nullif(trim(COALESCE(p_note,'')),''),p_actor_id,p_actor_name,p_actor_email);
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1,COALESCE((v_item->>'qty')::integer,1)); v_unit := round((v_item->>'unit_price')::numeric,2);
    SELECT * INTO v_product FROM public.products WHERE id=(v_item->>'product_id')::uuid;
    SELECT url INTO v_image FROM public.product_images WHERE product_id=v_product.id ORDER BY sort_order LIMIT 1;
    INSERT INTO public.order_items(order_id,product_id,name_snapshot,price_snapshot,qty,image_snapshot) VALUES(v_order_id,v_product.id,v_product.name,v_unit,v_qty,v_image);
    UPDATE public.products SET stock=stock-v_qty WHERE id=v_product.id;
  END LOOP;
  INSERT INTO public.trade_ledger(profile_id,order_id,kind,amount,note,due_date,created_by) VALUES(p_profile_id,v_order_id,'invoice',v_total,'Counter sale '||v_human,v_due,p_actor_name);
  INSERT INTO public.order_events(order_id,status,note,created_by) VALUES(v_order_id,'delivered','In-house wholesale counter sale created on offline credit',p_actor_name);
  RETURN QUERY SELECT v_order_id,v_human,v_token,v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.create_counter_sale(uuid,jsonb,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_counter_sale(uuid,jsonb,text,text,text,uuid,text,text) TO service_role;

CREATE POLICY "Super admins upload vendor QR codes" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'vendor-qr-codes' AND public.staff_role(auth.uid()) = 'super_admin'::public.staff_role
  );
CREATE POLICY "Super admins update vendor QR codes" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'vendor-qr-codes' AND public.staff_role(auth.uid()) = 'super_admin'::public.staff_role
  ) WITH CHECK (
    bucket_id = 'vendor-qr-codes' AND public.staff_role(auth.uid()) = 'super_admin'::public.staff_role
  );
CREATE POLICY "Super admins delete vendor QR codes" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'vendor-qr-codes' AND public.staff_role(auth.uid()) = 'super_admin'::public.staff_role
  );
CREATE POLICY "Staff read vendor QR codes" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'vendor-qr-codes' AND public.is_staff(auth.uid())
  );