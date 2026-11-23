CREATE UNIQUE INDEX IF NOT EXISTS products_name_key_unique
  ON public.products ((btrim(regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'), '-')));