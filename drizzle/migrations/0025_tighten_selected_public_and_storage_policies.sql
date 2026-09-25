ALTER POLICY "Vehicle specs are public"
ON public.vehicle_specs
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = vehicle_specs.product_id
      AND p.status = 'visible'::public.product_status
  )
);

ALTER POLICY "Public read categories"
ON public.categories
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.category_id = categories.id
      AND p.status = 'visible'::public.product_status
  )
  OR public.is_staff(auth.uid())
);

ALTER POLICY "Vehicle pricing is public"
ON public.vehicle_pricing
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = vehicle_pricing.product_id
      AND p.status = 'visible'::public.product_status
  )
);

ALTER POLICY "Public read product images"
ON public.product_images
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.status = 'visible'::public.product_status
  )
  OR public.is_staff(auth.uid())
);

ALTER POLICY "Public read compatibility"
ON public.product_compatibility
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_compatibility.product_id
      AND p.status = 'visible'::public.product_status
  )
  OR public.is_staff(auth.uid())
);

ALTER POLICY "Public read shop settings"
ON public.shop_settings
TO authenticated
USING (public.is_staff(auth.uid()));

ALTER POLICY "Anyone can ask to be told when stock returns"
ON public.stock_alerts
TO authenticated
WITH CHECK (profile_id = auth.uid());

ALTER POLICY "Anyone can ask about availability"
ON public.product_enquiries
TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

ALTER POLICY "Signed-in customers can upload review photos"
ON storage.objects
TO authenticated
WITH CHECK (
  bucket_id = 'review-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

ALTER POLICY "Signed-in customers can see review photos"
ON storage.objects
TO authenticated
USING (
  bucket_id = 'review-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_staff(auth.uid())
  )
);