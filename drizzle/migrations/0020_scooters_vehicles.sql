-- Vehicles (electric scooters) alongside spare parts.

CREATE TYPE public.product_kind AS ENUM ('part', 'vehicle');
CREATE TYPE public.booking_status AS ENUM ('booked', 'allotted', 'rto_in_progress', 'ready_for_delivery', 'delivered', 'cancelled');

ALTER TABLE public.products ADD COLUMN product_kind public.product_kind NOT NULL DEFAULT 'part';
CREATE INDEX products_product_kind_idx ON public.products (product_kind);

-- Specifications that only make sense for a whole vehicle.
CREATE TABLE public.vehicle_specs (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  variant text,
  colours text[] NOT NULL DEFAULT '{}',
  battery_type text,
  battery_capacity text,
  certified_range text,
  top_speed text,
  charging_time text,
  motor_power text,
  kerb_weight text,
  warranty_years numeric,
  warranty_km integer,
  registration_required boolean NOT NULL DEFAULT true,
  service_interval_months integer NOT NULL DEFAULT 6,
  service_interval_km integer NOT NULL DEFAULT 3000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_specs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_specs TO authenticated;
GRANT ALL ON public.vehicle_specs TO service_role;
ALTER TABLE public.vehicle_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicle specs are public" ON public.vehicle_specs FOR SELECT USING (true);
CREATE POLICY "Staff manage vehicle specs" ON public.vehicle_specs FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Itemised on-road price, because that is the number a buyer compares.
CREATE TABLE public.vehicle_pricing (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  ex_showroom numeric NOT NULL DEFAULT 0,
  rto numeric NOT NULL DEFAULT 0,
  insurance numeric NOT NULL DEFAULT 0,
  accessories numeric NOT NULL DEFAULT 0,
  subsidy numeric NOT NULL DEFAULT 0,
  on_road numeric GENERATED ALWAYS AS (ex_showroom + rto + insurance + accessories - subsidy) STORED,
  token_amount numeric NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vehicle_pricing TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_pricing TO authenticated;
GRANT ALL ON public.vehicle_pricing TO service_role;
ALTER TABLE public.vehicle_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicle pricing is public" ON public.vehicle_pricing FOR SELECT USING (true);
CREATE POLICY "Staff manage vehicle pricing" ON public.vehicle_pricing FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Bookings: a token amount now, the balance at delivery.
CREATE TABLE public.vehicle_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  human_id text NOT NULL UNIQUE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  profile_id uuid REFERENCES public.profiles(id),
  customer_name text NOT NULL,
  phone text NOT NULL,
  email text,
  address text,
  colour text,
  variant text,
  price_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  on_road_total numeric NOT NULL DEFAULT 0,
  token_amount numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL DEFAULT 0,
  status public.booking_status NOT NULL DEFAULT 'booked',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  payment_provider text,
  provider_order_id text,
  provider_payment_id text,
  public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  expected_delivery date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_bookings_phone_idx ON public.vehicle_bookings (phone);
CREATE INDEX vehicle_bookings_status_idx ON public.vehicle_bookings (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_bookings TO authenticated;
GRANT ALL ON public.vehicle_bookings TO service_role;
ALTER TABLE public.vehicle_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage bookings" ON public.vehicle_bookings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Customers read their own bookings" ON public.vehicle_bookings FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE TABLE public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.vehicle_bookings(id) ON DELETE CASCADE,
  status public.booking_status NOT NULL,
  note text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage booking events" ON public.booking_events FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Test rides, finance and exchange: forms that land in the manager panel.
CREATE TABLE public.test_ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  name text NOT NULL,
  phone text NOT NULL,
  preferred_date date,
  slot text,
  status text NOT NULL DEFAULT 'new',
  note text,
  handled_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.test_ride_requests TO authenticated;
GRANT ALL ON public.test_ride_requests TO service_role;
ALTER TABLE public.test_ride_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage test rides" ON public.test_ride_requests FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.finance_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  name text NOT NULL,
  phone text NOT NULL,
  down_payment numeric,
  tenure_months integer,
  monthly_income numeric,
  employment text,
  status text NOT NULL DEFAULT 'new',
  note text,
  handled_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.finance_enquiries TO authenticated;
GRANT ALL ON public.finance_enquiries TO service_role;
ALTER TABLE public.finance_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage finance enquiries" ON public.finance_enquiries FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.exchange_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id),
  name text NOT NULL,
  phone text NOT NULL,
  current_brand text,
  current_model text,
  year integer,
  km_run integer,
  condition text,
  photo_url text,
  quoted_value numeric,
  status text NOT NULL DEFAULT 'new',
  note text,
  handled_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.exchange_valuations TO authenticated;
GRANT ALL ON public.exchange_valuations TO service_role;
ALTER TABLE public.exchange_valuations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage exchange valuations" ON public.exchange_valuations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- After the sale: the machine itself, its warranty and its service life.
CREATE TABLE public.vehicle_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid UNIQUE REFERENCES public.vehicle_bookings(id),
  product_id uuid REFERENCES public.products(id),
  profile_id uuid REFERENCES public.profiles(id),
  owner_name text NOT NULL,
  phone text NOT NULL,
  chassis_number text,
  motor_number text,
  registration_number text,
  warranty_start date,
  delivered_on date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_registrations_phone_idx ON public.vehicle_registrations (phone);
GRANT SELECT, INSERT, UPDATE ON public.vehicle_registrations TO authenticated;
GRANT ALL ON public.vehicle_registrations TO service_role;
ALTER TABLE public.vehicle_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage registrations" ON public.vehicle_registrations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Customers read their own vehicles" ON public.vehicle_registrations FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE TABLE public.service_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.vehicle_registrations(id) ON DELETE CASCADE,
  label text NOT NULL,
  due_on date NOT NULL,
  due_km integer,
  status text NOT NULL DEFAULT 'due',
  reminded_at timestamptz,
  completed_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_schedule_due_idx ON public.service_schedule (due_on, status);
GRANT SELECT, INSERT, UPDATE ON public.service_schedule TO authenticated;
GRANT ALL ON public.service_schedule TO service_role;
ALTER TABLE public.service_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage service schedule" ON public.service_schedule FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES public.vehicle_registrations(id),
  product_id uuid REFERENCES public.products(id),
  name text NOT NULL,
  phone text NOT NULL,
  preferred_date date,
  slot text,
  issue text,
  status text NOT NULL DEFAULT 'new',
  note text,
  handled_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_bookings TO authenticated;
GRANT ALL ON public.service_bookings TO service_role;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage service bookings" ON public.service_bookings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.vehicle_registrations(id) ON DELETE CASCADE,
  performed_on date NOT NULL DEFAULT CURRENT_DATE,
  work_done text NOT NULL,
  odometer integer,
  cost numeric,
  next_due_on date,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.service_records TO authenticated;
GRANT ALL ON public.service_records TO service_role;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage service records" ON public.service_records FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- A customer follows their booking with the link they were given, no account needed.
CREATE OR REPLACE FUNCTION public.booking_by_token(p_token uuid)
RETURNS TABLE (
  human_id text,
  model_name text,
  model_slug text,
  colour text,
  variant text,
  status public.booking_status,
  payment_status public.payment_status,
  on_road_total numeric,
  token_amount numeric,
  balance_due numeric,
  price_breakdown jsonb,
  expected_delivery date,
  created_at timestamptz,
  events jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.human_id, p.name, p.slug, b.colour, b.variant, b.status, b.payment_status,
         b.on_road_total, b.token_amount, b.balance_due, b.price_breakdown, b.expected_delivery, b.created_at,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'at', e.created_at) ORDER BY e.created_at)
           FROM public.booking_events e WHERE e.booking_id = b.id
         ), '[]'::jsonb)
  FROM public.vehicle_bookings b
  JOIN public.products p ON p.id = b.product_id
  WHERE b.public_token = p_token
$$;
GRANT EXECUTE ON FUNCTION public.booking_by_token(uuid) TO anon, authenticated;

-- Build the service plan for a newly delivered vehicle.
CREATE OR REPLACE FUNCTION public.build_service_schedule(p_registration uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_months integer := 6;
  v_km integer := 3000;
  v_n integer;
  v_made integer := 0;
BEGIN
  SELECT COALESCE(r.warranty_start, r.delivered_on, CURRENT_DATE),
         COALESCE(s.service_interval_months, 6),
         COALESCE(s.service_interval_km, 3000)
    INTO v_start, v_months, v_km
    FROM public.vehicle_registrations r
    LEFT JOIN public.vehicle_specs s ON s.product_id = r.product_id
   WHERE r.id = p_registration;
  IF v_start IS NULL THEN RETURN 0; END IF;

  DELETE FROM public.service_schedule WHERE registration_id = p_registration AND status = 'due';

  FOR v_n IN 1..4 LOOP
    INSERT INTO public.service_schedule (registration_id, label, due_on, due_km)
    VALUES (p_registration, 'Service ' || v_n, v_start + (v_months * v_n || ' months')::interval, v_km * v_n);
    v_made := v_made + 1;
  END LOOP;
  RETURN v_made;
END;
$$;
GRANT EXECUTE ON FUNCTION public.build_service_schedule(uuid) TO service_role;