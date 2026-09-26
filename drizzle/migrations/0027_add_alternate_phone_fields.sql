ALTER TABLE public.orders ADD COLUMN alternate_phone text;
ALTER TABLE public.addresses ADD COLUMN alternate_phone text;
ALTER TABLE public.product_enquiries ADD COLUMN alternate_phone text;
ALTER TABLE public.trade_applications ADD COLUMN alternate_phone text;
ALTER TABLE public.vehicle_bookings ADD COLUMN alternate_phone text;
ALTER TABLE public.service_bookings ADD COLUMN alternate_phone text;
ALTER TABLE public.test_ride_requests ADD COLUMN alternate_phone text;
ALTER TABLE public.finance_enquiries ADD COLUMN alternate_phone text;

ALTER TABLE public.orders ADD CONSTRAINT orders_alternate_phone_format CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9][0-9]{9}$') NOT VALID;
ALTER TABLE public.addresses ADD CONSTRAINT addresses_alternate_phone_format CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9][0-9]{9}$') NOT VALID;
ALTER TABLE public.product_enquiries ADD CONSTRAINT product_enquiries_alternate_phone_format CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9][0-9]{9}$') NOT VALID;
ALTER TABLE public.trade_applications ADD CONSTRAINT trade_applications_alternate_phone_format CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9][0-9]{9}$') NOT VALID;
ALTER TABLE public.vehicle_bookings ADD CONSTRAINT vehicle_bookings_alternate_phone_format CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9][0-9]{9}$') NOT VALID;
ALTER TABLE public.service_bookings ADD CONSTRAINT service_bookings_alternate_phone_format CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9][0-9]{9}$') NOT VALID;
ALTER TABLE public.test_ride_requests ADD CONSTRAINT test_ride_requests_alternate_phone_format CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9][0-9]{9}$') NOT VALID;
ALTER TABLE public.finance_enquiries ADD CONSTRAINT finance_enquiries_alternate_phone_format CHECK (alternate_phone IS NULL OR alternate_phone ~ '^[6-9][0-9]{9}$') NOT VALID;