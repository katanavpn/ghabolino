CREATE POLICY "admin manage product files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'product-files' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-files' AND public.is_admin());

CREATE POLICY "admin manage media" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'media' AND public.is_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_admin());