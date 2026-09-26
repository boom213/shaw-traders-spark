CREATE OR REPLACE FUNCTION public.manage_order_page(
  p_query text DEFAULT '',
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 8
)
RETURNS TABLE(order_id uuid, total_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH parameters AS (
    SELECT NULLIF(BTRIM(p_query), '') AS query_text
  ),
  matching_orders AS (
    SELECT o.id, o.placed_at
    FROM public.orders o
    CROSS JOIN parameters params
    WHERE params.query_text IS NULL
       OR o.human_id ILIKE '%' || params.query_text || '%'
       OR o.contact_phone ILIKE '%' || params.query_text || '%'
       OR o.address->>'name' ILIKE '%' || params.query_text || '%'
  ),
  matching_count AS (
    SELECT COUNT(*) AS total_count FROM matching_orders
  ),
  page_orders AS (
    SELECT matching_order.id, matching_order.placed_at
    FROM matching_orders matching_order
    ORDER BY matching_order.placed_at DESC, matching_order.id DESC
    OFFSET GREATEST(p_offset, 0)
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT page_order.id, matching_count.total_count
  FROM page_orders page_order
  CROSS JOIN matching_count
  ORDER BY page_order.placed_at DESC, page_order.id DESC
$$;

REVOKE ALL ON FUNCTION public.manage_order_page(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_order_page(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.manager_trade_outstanding_page(
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 8
)
RETURNS TABLE(
  profile_id uuid,
  name text,
  phone text,
  balance numeric,
  credit_limit numeric,
  oldest_due date,
  overdue boolean,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH account_balances AS (
    SELECT
      p.id AS profile_id,
      COALESCE(NULLIF(p.full_name, ''), 'Trade customer') AS name,
      p.phone,
      COALESCE(SUM(CASE WHEN ledger.kind = 'payment' THEN -ledger.amount ELSE ledger.amount END), 0)::numeric AS balance,
      COALESCE(p.credit_limit, 0)::numeric AS credit_limit,
      MIN(ledger.due_date) FILTER (
        WHERE ledger.kind = 'invoice'
          AND NOT ledger.settled
          AND ledger.due_date IS NOT NULL
      ) AS oldest_due
    FROM public.profiles p
    LEFT JOIN public.trade_ledger ledger ON ledger.profile_id = p.id
    WHERE p.customer_type = 'trade'
    GROUP BY p.id, p.full_name, p.phone, p.credit_limit
  ),
  owing_accounts AS (
    SELECT account.*
    FROM account_balances account
    WHERE account.balance > 0
  ),
  matching_count AS (
    SELECT COUNT(*) AS total_count FROM owing_accounts
  ),
  page_accounts AS (
    SELECT account.*
    FROM owing_accounts account
    ORDER BY account.oldest_due ASC NULLS LAST, account.name ASC, account.profile_id ASC
    OFFSET GREATEST(p_offset, 0)
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  SELECT
    account.profile_id,
    account.name,
    account.phone,
    account.balance,
    account.credit_limit,
    account.oldest_due,
    COALESCE(account.oldest_due < (now() AT TIME ZONE 'Asia/Kolkata')::date, false) AS overdue,
    matching_count.total_count
  FROM page_accounts account
  CROSS JOIN matching_count
  ORDER BY account.oldest_due ASC NULLS LAST, account.name ASC, account.profile_id ASC
$$;

REVOKE ALL ON FUNCTION public.manager_trade_outstanding_page(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manager_trade_outstanding_page(integer, integer) TO service_role;