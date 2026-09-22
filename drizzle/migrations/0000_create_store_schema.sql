-- Enums
CREATE TYPE public.order_status AS ENUM ('order_confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','returned');
CREATE TYPE public.payment_status AS ENUM ('pending','paid','failed','refunded','cod_pending');
CREATE TYPE public.review_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.coupon_type AS ENUM ('percent','fixed');
CREATE TYPE public.staff_role AS ENUM ('owner','manager','staff');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Staff roles
CREATE TABLE public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.staff_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (profile_id, role)
);
GRANT SELECT ON public.staff_roles TO authenticated;
GRANT ALL ON public.staff_roles TO service_role;
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.staff_roles WHERE profile_id = _user_id)
$$;

CREATE POLICY "Own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Own profile delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Staff read roles" ON public.staff_roles FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR profile_id = auth.uid());

-- Addresses
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  line1 TEXT,
  landmark TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own addresses" ON public.addresses FOR ALL TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  blurb TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff write categories" ON public.categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory TEXT,
  brand TEXT,
  model TEXT,
  price NUMERIC(12,2),
  mrp NUMERIC(12,2),
  stock INT NOT NULL DEFAULT 0,
  description TEXT,
  specs JSONB NOT NULL DEFAULT '{}'::jsonb,
  voltage TEXT,
  ah TEXT,
  wattage TEXT,
  warranty TEXT,
  weight TEXT,
  dimensions TEXT,
  shipping_info TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON public.products(category_id);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products" ON public.products FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "Staff write products" ON public.products FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX product_images_product_idx ON public.product_images(product_id);
GRANT SELECT ON public.product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff write product images" ON public.product_images FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Product compatibility
CREATE TABLE public.product_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vehicle_model TEXT NOT NULL,
  UNIQUE (product_id, vehicle_model)
);
CREATE INDEX product_compat_model_idx ON public.product_compatibility(vehicle_model);
GRANT SELECT ON public.product_compatibility TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_compatibility TO authenticated;
GRANT ALL ON public.product_compatibility TO service_role;
ALTER TABLE public.product_compatibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read compatibility" ON public.product_compatibility FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff write compatibility" ON public.product_compatibility FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  human_id TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'order_confirmed',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  shipping_method TEXT,
  address JSONB NOT NULL DEFAULT '{}'::jsonb,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_profile_idx ON public.orders(profile_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer reads own orders" ON public.orders FOR SELECT TO authenticated USING (profile_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Customer creates own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Staff update orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete orders" ON public.orders FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  price_snapshot NUMERIC(12,2),
  qty INT NOT NULL DEFAULT 1,
  image_snapshot TEXT
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own order items" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.profile_id = auth.uid() OR public.is_staff(auth.uid())))
);
CREATE POLICY "Insert own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.profile_id = auth.uid())
);
CREATE POLICY "Staff write order items" ON public.order_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Order events
CREATE TABLE public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_events_order_idx ON public.order_events(order_id);
GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own order events" ON public.order_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.profile_id = auth.uid() OR public.is_staff(auth.uid())))
);
CREATE POLICY "Staff write order events" ON public.order_events FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  status public.review_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX reviews_product_idx ON public.reviews(product_id);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Own reviews read" ON public.reviews FOR SELECT TO authenticated USING (profile_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Own reviews insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Staff write reviews" ON public.reviews FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type public.coupon_type NOT NULL,
  value NUMERIC(12,2) NOT NULL,
  min_order NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_discount NUMERIC(12,2),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  usage_limit INT,
  times_used INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read live coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (
  is_active AND (starts_at IS NULL OR starts_at <= now()) AND (expires_at IS NULL OR expires_at >= now())
);
CREATE POLICY "Staff write coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read audit" ON public.audit_log FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff write audit" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));