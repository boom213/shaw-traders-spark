DROP POLICY IF EXISTS "Customer creates own orders" ON public.orders;
DROP POLICY IF EXISTS "Insert own order items" ON public.order_items;
REVOKE INSERT ON public.orders FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.order_items FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.best_sellers(p_days integer DEFAULT 90, p_limit integer DEFAULT 12)
 RETURNS TABLE(product_id uuid, sold bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT oi.product_id, SUM(oi.qty)::bigint AS sold
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id IS NOT NULL
    AND o.placed_at >= now() - make_interval(days => GREATEST(1, LEAST(365, p_days)))
    AND o.status <> 'cancelled'
    AND (
      o.payment_status = 'paid'
      OR EXISTS (SELECT 1 FROM public.counter_sales cs WHERE cs.order_id = o.id AND cs.cancelled_at IS NULL)
    )
  GROUP BY oi.product_id
  ORDER BY sold DESC
  LIMIT GREATEST(1, LEAST(50, p_limit));
$function$;

CREATE OR REPLACE FUNCTION public.staff_role(_user_id uuid)
 RETURNS staff_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.staff_roles
  WHERE profile_id = _user_id
    AND (
      _user_id = auth.uid()
      OR COALESCE(auth.role(), '') NOT IN ('anon', 'authenticated')
      OR EXISTS (SELECT 1 FROM public.staff_roles me WHERE me.profile_id = auth.uid())
    )
  ORDER BY CASE role
    WHEN 'super_admin' THEN 0
    WHEN 'owner' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'staff' THEN 3
    ELSE 4
  END
  LIMIT 1
$function$;

REVOKE EXECUTE ON FUNCTION public.trade_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trade_overdue(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tier_price(uuid, public.price_tier, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.customer_tier(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.build_service_schedule(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trade_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.trade_overdue(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.tier_price(uuid, public.price_tier, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_tier(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.build_service_schedule(uuid) TO service_role;