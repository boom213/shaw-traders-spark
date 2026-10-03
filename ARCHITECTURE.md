# Shaw Traders EV Architecture

This is a working guide for the next person or AI changing this repository. It records the boundaries that matter in production, especially where authorization, transactions, database grants, and money handling live. Read it before changing a server function, SQL routine, product column, or staff permission.

## 1. What this is

Shaw Traders EV is one TanStack Start application serving an EV spare-parts storefront and an operations console for retail customers, approved wholesale dealers, and staff. It also covers scooters, bookings, service records, counter sales, suppliers, customer credit, payments, quotes, invoices, and content management. Of 76 route files, 30 are under the `/manage` route family, so the staff console is roughly two-fifths of the routing surface: this is an operations system with a storefront, not only a shop.

## 2. Stack and shape

The application uses:

- TanStack Start for SSR, file-based routing, and typed server functions.
- React 19 and TanStack Query for UI and server-state orchestration.
- Tailwind CSS v4 for styling.
- Supabase Postgres for durable data, authentication, row-level security (RLS), and SQL routines.
- Drizzle's migration directory for ordered, plain-SQL migrations.
- Zod where schema validation is appropriate, plus explicit validators in many server functions.
- `pdf-lib` for Tax Invoice and Proforma Invoice generation.

Current repository inventory:

- 76 TypeScript route files in `src/routes`.
- 38 `src/lib/*.functions.ts` modules containing client-callable server functions.
- 18 `src/lib/*.server.ts` modules containing server-only helpers.
- 55 public database tables.
- 61 public SQL routines represented in the generated database types.
- 69 SQL migrations, numbered `0000` through `0068`, in `drizzle/migrations`.

There is no separate application API service. For app-internal work, a `createServerFn` is the typed boundary from a route or component to server execution. Stable raw HTTP contracts—webhooks, cron callbacks, public downloads, and health checks—live under `src/routes/api/public`.

Files ending in `.functions.ts` are client-importable declarations. Server-only modules, secrets, and the privileged database client must not be imported at their module scope; load those inside a server-function handler or place helpers in a `.server.ts` file.

## 3. The write boundary

This codebase has two deliberately different write paths.

Ordinary owner-scoped browser writes, such as a customer's addresses, profile details, and saved lists, use the browser client and are fenced by RLS. Owner-readable tables commonly use predicates such as `profile_id = auth.uid()`, sometimes extended with `OR public.is_staff(auth.uid())` for staff visibility.

Business-critical and privileged writes use server functions and the server-only `supabaseAdmin` client. The service role bypasses RLS, so **RLS does not authorize those writes**. Authorization must happen in the server function before the privileged client is loaded, typically through `currentUserId`, `tradeAccount`, or `requireStaff({ capability: ... })`. Input validation belongs there too.

The quote tables demonstrate the strictest version of this boundary:

- `quote_requests` and `quote_request_items` grant authenticated users `SELECT` only.
- Their SELECT policies allow the owning customer or staff to read rows.
- There are no client INSERT, UPDATE, or DELETE policies.
- Creation, pricing, and responses go through server functions and the service-role-only routines `create_quote_request`, `price_quote_request`, and `respond_to_quote_request`.

A table with no client write policy is therefore not necessarily incomplete. For quotes it is the protection that prevents a customer from setting `unit_price`. Do not “complete” that schema by adding INSERT or UPDATE policies. A browser-client write to those tables is expected to fail; every quote mutation must use its authorized server function.

The rule is:

> RLS authorizes browser/client access. A privileged server function authorizes service-role access. Never assume an RLS policy protects a write that uses `supabaseAdmin`.

## 4. Who owns what: TypeScript versus SQL

Postgres routines own operations that must commit or roll back as one unit across tables, especially when money, inventory, ledgers, payment state, or immutable snapshots are involved. Examples include creating an order with lines and stock movement, creating or cancelling a counter sale, recording linked payment and vendor-float entries, pricing every quote line, and recording supplier or trade ledger entries.

TypeScript server functions own authentication and authorization, input shaping and validation, orchestration, audit calls, public/private response shaping, and external services such as Razorpay, WhatsApp, email, and PDF generation. A server function may perform a simple single-table write after authorization; it should delegate multi-table financial or stock invariants to SQL.

The application currently invokes 50 distinct RPC routines. Grouped by responsibility:

- **Catalogue and storefront:** `best_sellers`, `search_product_ids`, `log_search_miss`, `preview_coupon`, `rename_product_brand`, `reorder_categories`.
- **Retail orders and payments:** `create_order`, `mark_order_paid`, `release_order`, `resolve_payment_review`, `set_order_gst`, `sync_order_refund_total`.
- **Order and customer management:** `manage_order_page`, `manage_order_counts`, `manage_customer_page`, `manager_customer_order_summary`, `manager_stats`, `manager_product_attention_counts`, `manager_dashboard_summary`, `manager_trade_outstanding_page`.
- **Payment reporting:** `payment_report_summary`, `online_payment_report_page`, `counter_payment_report_page`.
- **Counter sales and vendor money:** `create_counter_sale`, `cancel_counter_sale`, `record_counter_sale_payment_with_vendor`, `void_counter_sale_payment`, `set_cheque_status`, `record_vendor_payment`, `manager_vendor_float_totals`.
- **Wholesale and quotes:** `create_quote_request`, `price_quote_request`, `respond_to_quote_request`, `quote_by_token`, `record_trade_ledger_entry`, `trade_balance`, `trade_overdue`, `tier_price`, `decide_trade_application`.
- **Supplier ledger:** `record_supplier_entry`, `void_supplier_entry`, `supplier_ledger_page`, `supplier_summary_page`.
- **Vehicles and bookings:** `booking_by_token`, `mark_booking_paid`, `resolve_booking_payment_review`, `build_service_schedule`.
- **Staff and health:** `grant_staff_owner`, `staff_role`, `schema_health`.

The generated types expose additional database helpers that application code does not currently call directly. Do not treat every generated routine as an application boundary.

**Rule for new work:** if one operation writes more than one table and money or stock depends on all writes succeeding together, implement the invariant in one SQL routine. Put authorization, validation, provider calls, and presentation orchestration in TypeScript.

## 5. Changing a `SECURITY DEFINER` routine

`SECURITY DEFINER` routines run with their owner's privileges. They must pin `search_path` and must not retain default execute access.

The quote GST change is the warning example. `price_quote_request` already had this signature:

```sql
public.price_quote_request(uuid, jsonb, timestamptz, text, text)
```

Migration `0067_add_quote_gst_fields.sql` added `gst_rate` and `gst_included` columns instead of changing that signature. `src/lib/quote-requests.functions.ts` writes those columns after Manager+ authorization, then calls the existing pricing routine.

Why this caution matters:

- `CREATE OR REPLACE FUNCTION` cannot change an existing function's argument signature; different arguments create another overload.
- The old overload remains callable until explicitly dropped and can make PostgREST resolution ambiguous.
- PostgreSQL grants EXECUTE to PUBLIC on a newly created function by default.
- Recreating a sensitive function without fresh revocations can expose it to ordinary users. For `price_quote_request`, that could let a customer write their own prices.

Prefer an additive column and a separately authorized write when it preserves the transaction guarantees you need. If a signature genuinely must change:

```sql
DROP FUNCTION public.example(exact, old, argument, types);
CREATE FUNCTION public.example(/* new signature */) ...
  SECURITY DEFINER
  SET search_path = public;
REVOKE ALL ON FUNCTION public.example(/* new types */)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.example(/* new types */) TO service_role;
```

Then query `pg_proc`/`pg_namespace` to confirm that only the intended signature exists, and inspect `proacl` to confirm PUBLIC is absent. Never rely on the previous overload's ACL carrying forward.

## 6. The `products` column allowlist

`public.products` intentionally has no table-wide SELECT grant for `anon` or `authenticated`. Migration `0013_ordering_mode_status_rack.sql` withdrew blanket SELECT and introduced explicit column grants. Migration `0021_grant_product_kind_read.sql` extended those grants for later fields. Migration `0068_reassert_product_column_grants.sql` reasserted the complete allowlist after a table-wide grant drifted into the live database.

The current allowlist exposes 29 columns to `anon` and 32 to `authenticated`. `rack_location` is exposed to neither; staff-only server paths use the service role for picking lists and staff invoice copies. The authenticated-only additions are `min_order_qty`, `order_multiple`, and `trade_only`.

**When adding a column to `products`, grant it explicitly in a migration to only the roles that should read it. NEVER run `GRANT SELECT ON public.products TO anon` or the authenticated equivalent.** A table-wide grant overrides the column allowlist and silently exposes `rack_location` plus every future private field. That exact mistake was fixed by migration `0068`; a future cost or margin column would otherwise become public as soon as it was created.

Check for drift in seconds:

```sql
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND grantee IN ('anon', 'authenticated');
```

This query must return no rows. Column grants can then be inspected through `information_schema.column_privileges`; table-level RLS does not replace this column boundary.

## 7. Migrations

Schema history is a sequence of numbered SQL files in `drizzle/migrations`; generated database types are committed in `src/integrations/supabase/types.ts`. Apply schema changes through the project migration tool, which writes and applies the migration and refreshes those types.

Deployment order is a production rule:

1. Apply the migration.
2. Confirm it succeeded and the generated types are current.
3. Run `NOTIFY pgrst, 'reload schema';` in the migration when columns, routines, or grants need the API schema cache refreshed.
4. Only then release code that depends on the new schema.

This order was previously reversed: code reached production before its required column existed and Counter Sales broke. Do not make application code “temporarily tolerant” as a substitute for applying its migration first. Keep migrations additive; do not hand-edit generated migration metadata or generated database types.

## 8. Staff access model

`src/lib/staff-permissions.ts` defines five ranked roles, named capabilities, and route-to-capability mapping. `can(role, capability)` calls `roleAtLeast(role, CAPABILITY_ROLE[capability])`, so a capability whose minimum is `manager` is inherited by `owner` and `super_admin`. `MANAGE_ROUTE_CAPABILITY` maps each `/manage` destination to the capability required by navigation and guards. Adding a capability normally means defining it once with its minimum rank and mapping the relevant route.

Authorization must still be enforced inside every privileged server function with `requireStaff`; hiding a navigation item or guarding a route is not a server-side security boundary.

Be aware of one naming oddity:

```text
online_sales (label: “Sales Manager”) = rank 0
staff                               = rank 1
manager                             = rank 2
owner                               = rank 3
super_admin                         = rank 4
```

`online_sales` has the `online-orders` capability but cannot open enquiries, bookings, customers, or other `operations` pages that plain Staff can. The display label sounds more senior than the role actually is; do not infer permissions from the label.

## 9. The five money-entry workflows

### Retail online checkout

Entry route: `/checkout`. `startCheckout` authorizes a signed-in retail customer, validates the cart and address, and calls `create_order`, which recomputes prices, GST, shipping, discounts, minimums, snapshots, and stock inside Postgres. Razorpay is then started in TypeScript using paise. Successful callbacks or verified client responses call `mark_order_paid`; abandoned reservations call `release_order`. COD code paths exist in the order model, but the current checkout server function rejects Cash on Delivery.

### Counter sales

Entry route: `/manage/counter-sales`. Manager+ staff create a wholesale walk-in sale through `create_counter_sale`. Payments can be split across methods including cash, vendor QR, and cheque; linked payment and vendor-float entries use `record_counter_sale_payment_with_vendor`, with `set_cheque_status`, `void_counter_sale_payment`, and `cancel_counter_sale` preserving the audit trail. Counter Sales may deliberately sell above recorded stock because staff may be selling stock physically present on the shelf; the database floors recorded stock at zero and cancellation restores only what was deducted.

### Wholesale quotes

Customer entry route: `/trade/quote-list`; staff pricing route: `/manage/quotes`. Approved wholesale customers submit products and quantities through `create_quote_request` without seeing catalogue rates. Manager+ prices every line with `price_quote_request`, adds optional GST fields, and sets an expiry. Customers use `respond_to_quote_request`; accepted pricing remains a negotiated snapshot and can be downloaded as a Proforma Invoice, explicitly not a Tax Invoice.

### Vehicle bookings

Entry routes begin at `/scooters/$slug`; public tracking is `/booking/$token`, and staff management is `/manage/bookings`. A booking separates token amount from balance. Razorpay confirmation calls `mark_booking_paid`; ambiguous or late payments are held for `resolve_booking_payment_review`. Token-based public reads use `booking_by_token` rather than exposing unrestricted booking rows.

### Service jobs

Customer entry route: `/service`; staff handles records through `/manage/bookings`. A service request creates a booking, while staff records work, odometer, cost, and the next due date and may call `build_service_schedule`. The current service flow records job cost but does not implement a dedicated service-payment ledger or online collection routine; do not treat `service_records.cost` as proof that payment was received.

## 10. Other things that will catch you

- **Translations are compile-time strict:** `EN` defines `TranslationKey`; `BN` and `HI` are `Record<TranslationKey, string>`, so adding a key to English without both translations fails type checking.
- **Wholesale rates are fail-closed:** `useCatalogueRateVisibility` lives in `src/hooks/useTrade.ts`; while signed-in trade/staff resolution is pending, it hides rates so an approved dealer never sees a retail-price flash.
- **Some tests inspect source text:** `tests/customer-shopping-access.test.ts` has broken on legitimate refactors because it asserts literal implementation strings; read such failures before changing correct application code.
- **Seven tests require live database credentials:** `fitment-enquiries`, `order-flow`, `ordering-visibility`, `product-search`, `staff-role`, `trade-pricing`, and `vehicle-booking` construct live clients. Without the required server environment, they fail before assertions with errors such as `supabaseKey is required`; that is not an application regression.
- **`.env` is tracked:** it currently contains only publishable configuration and public identifiers. Never add a service-role key, database password, provider secret, customer data, or any other secret to it or to any committed file.
- **Public server functions are public endpoints:** route guards protect pages, not RPC calls. Every sensitive handler must authorize independently before loading `supabaseAdmin`.
- **Server imports are transitive:** a module-scope import of `client.server` from a client-reachable `.functions.ts` file breaks the client graph. Dynamically import it inside the handler after authorization.
- **Money snapshots are immutable history:** later catalogue, GST, courier, or profile changes must not silently rewrite agreed orders, payments, quotes, Proforma Invoices, or Tax Invoices.

## Working checklist

Before releasing a change, be able to answer:

1. Is this write authorized by RLS as the caller, or by a server function before service-role access?
2. If money or stock spans multiple tables, is one SQL routine enforcing the transaction?
3. If a `SECURITY DEFINER` signature changed, were old overloads removed and all execute grants re-established and verified?
4. If `products` changed, were column grants explicit, with no table-wide SELECT grant?
5. Was the migration applied and the API schema reloaded before dependent code was released?
6. Are audit entries and immutable snapshots preserved?