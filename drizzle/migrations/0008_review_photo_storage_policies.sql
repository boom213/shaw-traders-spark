CREATE POLICY "Signed-in customers can upload review photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos');

CREATE POLICY "Staff manage review photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND public.is_staff(auth.uid()));

CREATE POLICY "Signed-in customers can see review photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'review-photos');