CREATE TABLE public.quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  human_id text NOT NULL UNIQUE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'priced', 'accepted', 'rejected', 'expired')),
  customer_note text,
  staff_note text,
  decision_note text,
  priced_by text,
  priced_at timestamptz,
  expires_at timestamptz,
  supersedes_id uuid REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quote_requests TO authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers and staff can read quote requests"
ON public.quote_requests FOR SELECT TO authenticated
USING (profile_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE public.quote_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  sku_snapshot text,
  qty integer NOT NULL CHECK (qty > 0),
  unit_price numeric,
  line_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quote_request_items TO authenticated;
GRANT ALL ON public.quote_request_items TO service_role;
ALTER TABLE public.quote_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers and staff can read quote request items"
ON public.quote_request_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quote_requests q
  WHERE q.id = quote_request_id
    AND (q.profile_id = auth.uid() OR public.is_staff(auth.uid()))
));

CREATE INDEX quote_requests_profile_created_idx ON public.quote_requests(profile_id, created_at DESC);
CREATE INDEX quote_requests_status_idx ON public.quote_requests(status);
CREATE INDEX quote_request_items_request_idx ON public.quote_request_items(quote_request_id);

CREATE OR REPLACE FUNCTION public.create_quote_request(
  p_profile_id uuid,
  p_lines jsonb,
  p_customer_note text DEFAULT NULL
) RETURNS TABLE(quote_id uuid, human_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_line jsonb;
  v_product public.products%ROWTYPE;
  v_quote_id uuid;
  v_human text;
  v_qty integer;
  v_count integer;
  v_attempt integer := 0;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_profile_id FOR UPDATE;
  IF NOT FOUND OR v_profile.customer_type <> 'trade' OR v_profile.trade_approved_at IS NULL THEN
    RAISE EXCEPTION 'An approved wholesale account is required.';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN
    RAISE EXCEPTION 'Add at least one valid part.';
  END IF;
  v_count := jsonb_array_length(p_lines);
  IF v_count < 1 THEN RAISE EXCEPTION 'Add at least one valid part.'; END IF;
  IF v_count > 100 THEN RAISE EXCEPTION 'A quote can contain at most 100 lines.'; END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_human := 'QT-' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'YYMMDD') || '-' || lpad(floor(random() * 10000)::integer::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.quote_requests q WHERE q.human_id = v_human);
    IF v_attempt >= 25 THEN RAISE EXCEPTION 'Could not create a quote reference. Please try again.'; END IF;
  END LOOP;

  INSERT INTO public.quote_requests(human_id, profile_id, customer_note)
  VALUES (v_human, p_profile_id, nullif(trim(COALESCE(p_customer_note, '')), ''))
  RETURNING id INTO v_quote_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    BEGIN
      v_qty := LEAST(9999, GREATEST(1, COALESCE((v_line->>'qty')::integer, 1)));
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      v_qty := 1;
    END;
    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_line->>'product_id')::uuid AND status = 'visible';
    IF NOT FOUND THEN RAISE EXCEPTION 'A selected part is no longer available.'; END IF;
    INSERT INTO public.quote_request_items(quote_request_id, product_id, name_snapshot, sku_snapshot, qty)
    VALUES (v_quote_id, v_product.id, v_product.name, v_product.sku, v_qty);
  END LOOP;

  RETURN QUERY SELECT v_quote_id, v_human;
END;
$$;
REVOKE ALL ON FUNCTION public.create_quote_request(uuid,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_quote_request(uuid,jsonb,text) TO service_role;

CREATE OR REPLACE FUNCTION public.price_quote_request(
  p_quote_id uuid,
  p_lines jsonb,
  p_expires_at timestamptz,
  p_staff_note text,
  p_priced_by text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_quote public.quote_requests%ROWTYPE;
  v_line jsonb;
  v_item_count integer;
  v_supplied_count integer;
  v_price numeric;
BEGIN
  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    RAISE EXCEPTION 'Choose a future expiry date.';
  END IF;
  SELECT * INTO v_quote FROM public.quote_requests WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote request not found.'; END IF;
  IF v_quote.status IN ('accepted', 'rejected') THEN RAISE EXCEPTION 'This quote has already been answered.'; END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' THEN RAISE EXCEPTION 'Price every quote line.'; END IF;
  SELECT count(*) INTO v_item_count FROM public.quote_request_items WHERE quote_request_id = p_quote_id;
  v_supplied_count := jsonb_array_length(p_lines);
  IF v_item_count <> v_supplied_count OR v_item_count = 0 THEN RAISE EXCEPTION 'Price every quote line exactly once.'; END IF;
  IF (SELECT count(DISTINCT value->>'item_id') FROM jsonb_array_elements(p_lines)) <> v_item_count THEN
    RAISE EXCEPTION 'Price every quote line exactly once.';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    BEGIN
      v_price := round((v_line->>'unit_price')::numeric, 2);
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Enter a valid price for every line.';
    END;
    IF v_price <= 0 THEN RAISE EXCEPTION 'Enter a valid price for every line.'; END IF;
    UPDATE public.quote_request_items
    SET unit_price = v_price,
        line_note = nullif(trim(COALESCE(v_line->>'line_note', '')), '')
    WHERE id = (v_line->>'item_id')::uuid AND quote_request_id = p_quote_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'A quote line could not be found.'; END IF;
  END LOOP;

  UPDATE public.quote_requests
  SET status = 'priced', staff_note = nullif(trim(COALESCE(p_staff_note, '')), ''),
      priced_by = p_priced_by, priced_at = now(), expires_at = p_expires_at, updated_at = now()
  WHERE id = p_quote_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.price_quote_request(uuid,jsonb,timestamptz,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.price_quote_request(uuid,jsonb,timestamptz,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.respond_to_quote_request(
  p_quote_id uuid,
  p_profile_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_decision NOT IN ('accepted', 'rejected') THEN RAISE EXCEPTION 'Choose accept or reject.'; END IF;
  UPDATE public.quote_requests
  SET status = p_decision,
      decision_note = nullif(trim(COALESCE(p_note, '')), ''),
      updated_at = now()
  WHERE id = p_quote_id
    AND profile_id = p_profile_id
    AND status = 'priced'
    AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'This quote is no longer available to answer.'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_quote_request(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_quote_request(uuid,uuid,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';