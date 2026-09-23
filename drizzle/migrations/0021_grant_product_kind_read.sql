-- Visitors need to tell a whole scooter from a spare part; rack_location stays private.
GRANT SELECT (product_kind) ON public.products TO anon, authenticated;
GRANT SELECT (min_order_qty, order_multiple, trade_only) ON public.products TO authenticated;