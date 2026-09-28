ALTER TABLE public.qr_vendors ALTER COLUMN qr_image_path DROP NOT NULL;
COMMENT ON COLUMN public.qr_vendors.qr_image_path IS 'DEPRECATED: retained for historical vendor rows; new vendor management is name-only.';
COMMENT ON COLUMN public.qr_vendors.upi_id IS 'DEPRECATED: retained for historical vendor rows; new vendor management is name-only.';