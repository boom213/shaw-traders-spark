ALTER TABLE public.trade_applications
  ADD COLUMN IF NOT EXISTS business_type text,
  ADD COLUMN IF NOT EXISTS years_in_business text,
  ADD COLUMN IF NOT EXISTS staff_count text,
  ADD COLUMN IF NOT EXISTS monthly_volume text,
  ADD COLUMN IF NOT EXISTS brands text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS part_categories text[] NOT NULL DEFAULT '{}';