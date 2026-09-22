-- Identity documents: the applicant may upload and delete their own folder,
-- staff may read and delete. Nothing is ever public.
CREATE POLICY "Applicant uploads own trade documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trade-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Applicant reads own trade documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trade-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));

CREATE POLICY "Applicant deletes own trade documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trade-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid())));
