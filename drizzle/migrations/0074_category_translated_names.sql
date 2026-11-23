ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_hi text, ADD COLUMN IF NOT EXISTS name_bn text;
COMMENT ON COLUMN public.categories.name_hi IS 'Hindi display name; storefront falls back to name when empty';
COMMENT ON COLUMN public.categories.name_bn IS 'Bengali display name; storefront falls back to name when empty';
NOTIFY pgrst, 'reload schema';