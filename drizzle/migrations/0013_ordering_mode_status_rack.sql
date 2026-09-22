-- Ordering mode (site / category / product), product status and rack location.

CREATE TYPE public.ordering_mode AS ENUM ('full','enquiry','browse');
CREATE TYPE public.product_status AS ENUM ('draft','visible','hidden');

-- Site-wide switch
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS ordering_mode public.ordering_mode NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS browse_banner text;

-- Per category
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS ordering_mode public.ordering_mode;

-- Per product, plus status and rack location
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ordering_mode public.ordering_mode,
  ADD COLUMN IF NOT EXISTS status public.product_status NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS rack_location text;

UPDATE public.products SET status = CASE WHEN is_active THEN 'visible'::public.product_status ELSE 'hidden'::public.product_status END;

COMMENT ON COLUMN public.products.is_active IS 'DEPRECATED: replaced by status (draft/visible/hidden); kept in sync by trigger products_sync_is_active';

-- Keep the deprecated flag in step with the new status so older queries stay correct.
CREATE OR REPLACE FUNCTION public.sync_product_is_active()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.is_active = (NEW.status = 'visible');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS products_sync_is_active ON public.products;
CREATE TRIGGER products_sync_is_active BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_is_active();

CREATE INDEX IF NOT EXISTS products_status_idx ON public.products(status);

-- Only visible products are public.
ALTER POLICY "Public read products" ON public.products
  USING (status = 'visible' OR public.is_staff(auth.uid()));

-- Rack location is staff-only: withdraw blanket SELECT and grant every other column.
REVOKE SELECT ON public.products FROM anon;
REVOKE SELECT ON public.products FROM authenticated;
GRANT SELECT (id, sku, slug, name, category_id, subcategory, brand, model, price, mrp, stock,
              description, specs, voltage, ah, wattage, warranty, weight, dimensions,
              shipping_info, is_active, created_at, updated_at, hsn_code, reorder_threshold,
              box_contents, ordering_mode, status)
  ON public.products TO anon;
GRANT SELECT (id, sku, slug, name, category_id, subcategory, brand, model, price, mrp, stock,
              description, specs, voltage, ah, wattage, warranty, weight, dimensions,
              shipping_info, is_active, created_at, updated_at, hsn_code, reorder_threshold,
              box_contents, ordering_mode, status)
  ON public.products TO authenticated;

-- Staff role ranking now puts the permanent super admins first.
CREATE OR REPLACE FUNCTION public.staff_role(_user_id uuid)
RETURNS public.staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.staff_roles
  WHERE profile_id = _user_id
  ORDER BY CASE role WHEN 'super_admin' THEN 0 WHEN 'owner' THEN 1 WHEN 'manager' THEN 2 ELSE 3 END
  LIMIT 1
$$;

-- Availability enquiries raised while the shop is in enquiry mode.
CREATE TABLE IF NOT EXISTS public.product_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  note text,
  status text NOT NULL DEFAULT 'new',
  handled_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.product_enquiries TO anon, authenticated;
GRANT SELECT, UPDATE ON public.product_enquiries TO authenticated;
GRANT ALL ON public.product_enquiries TO service_role;
ALTER TABLE public.product_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can ask about availability" ON public.product_enquiries
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff read enquiries" ON public.product_enquiries
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update enquiries" ON public.product_enquiries
  FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS product_enquiries_created_idx ON public.product_enquiries(created_at DESC);