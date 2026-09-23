CREATE TABLE public.about_gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX about_gallery_photos_order_idx ON public.about_gallery_photos (is_active, sort_order);

GRANT SELECT ON public.about_gallery_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.about_gallery_photos TO authenticated;
GRANT ALL ON public.about_gallery_photos TO service_role;

ALTER TABLE public.about_gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active about photos" ON public.about_gallery_photos
  FOR SELECT TO anon, authenticated
  USING (is_active);

CREATE POLICY "Staff write about photos" ON public.about_gallery_photos
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER about_gallery_photos_touch BEFORE UPDATE ON public.about_gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();