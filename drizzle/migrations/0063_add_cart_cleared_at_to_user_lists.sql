ALTER TABLE public.user_lists
ADD COLUMN cart_cleared_at BIGINT NULL;

COMMENT ON COLUMN public.user_lists.cart_cleared_at IS 'Client epoch milliseconds of the most recent deliberate cart clear, used to prevent stale cart restoration.';