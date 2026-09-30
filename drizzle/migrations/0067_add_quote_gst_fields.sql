ALTER TABLE public.quote_requests
  ADD COLUMN gst_rate numeric,
  ADD COLUMN gst_included boolean NOT NULL DEFAULT false;

NOTIFY pgrst, 'reload schema';