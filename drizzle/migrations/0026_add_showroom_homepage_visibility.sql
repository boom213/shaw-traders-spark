ALTER TABLE public.shop_settings
ADD COLUMN show_showroom_section boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.shop_settings.show_showroom_section IS 'Controls whether the electric scooter showroom section appears on the homepage.';