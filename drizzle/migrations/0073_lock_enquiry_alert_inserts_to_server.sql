DROP POLICY IF EXISTS "Anyone can ask about availability" ON public.product_enquiries;
DROP POLICY IF EXISTS "Anyone can ask to be told when stock returns" ON public.stock_alerts;
REVOKE INSERT ON public.product_enquiries FROM anon, authenticated;
REVOKE INSERT ON public.stock_alerts FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';