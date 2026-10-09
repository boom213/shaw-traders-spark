import { createServerFn } from "@tanstack/react-start";
import { CSV_EXPORT_LIMIT, csvDateTime, csvFileName, toCsv, type CsvExportResult } from "@/lib/csv";

type Row = Record<string, any>;
type ExportContext = Awaited<ReturnType<(typeof import("@/lib/csv.server"))["csvExportContext"]>>;

const clean = (value: unknown, max = 120) =>
  String(value ?? "")
    .trim()
    .slice(0, max);
const page = (value: unknown) => Math.max(0, Math.floor(Number(value ?? 0)));
const safeDate = (value: unknown) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) ? String(value) : null;
const dateInput = (data: { from?: string; to?: string } | undefined) => {
  const range = { from: safeDate(data?.from), to: safeDate(data?.to) };
  if (range.from && range.to && range.from > range.to)
    throw new Error("From date must be before To date.");
  return range;
};
const applyDateRange = <
  T extends {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
  },
>(
  query: T,
  column: string,
  range: { from: string | null; to: string | null },
) => {
  let filtered = query;
  if (range.from) filtered = filtered.gte(column, `${range.from}T00:00:00+05:30`);
  if (range.to) filtered = filtered.lte(column, `${range.to}T23:59:59.999+05:30`);
  return filtered;
};
const result = (
  dataset: string,
  headers: string[],
  rows: unknown[][],
  truncated = false,
): CsvExportResult => ({
  csv: toCsv(headers, rows),
  fileName: csvFileName(dataset),
  rows: rows.length,
  truncated,
});

async function finish(
  context: ExportContext,
  dataset: string,
  filters: Record<string, unknown>,
  exportResult: CsvExportResult,
) {
  const { auditCsvExport } = await import("@/lib/csv.server");
  await auditCsvExport(
    context.sb as never,
    context.actor,
    context.logAudit,
    dataset,
    exportResult,
    filters,
  );
  return exportResult;
}

const orderInput = (
  data:
    { q?: string; status?: string; paymentStatus?: string; from?: string; to?: string } | undefined,
) => ({
  q: clean(data?.q),
  status: clean(data?.status, 30),
  paymentStatus: clean(data?.paymentStatus, 30),
  from: safeDate(data?.from),
  to: safeDate(data?.to),
});
export const exportOrdersCsv = createServerFn({ method: "POST" })
  .inputValidator(orderInput)
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    const { data: idRows, error } = await context.sb.rpc("manage_order_page", {
      p_query: data.q,
      p_offset: 0,
      p_limit: CSV_EXPORT_LIMIT + 1,
      p_status: data.status,
      p_payment_status: data.paymentStatus,
      p_from: data.from,
      p_to: data.to,
    });
    if (error) throw new Error(error.message);
    const ids = (idRows ?? []).slice(0, CSV_EXPORT_LIMIT).map((row) => String(row.order_id));
    const rows: Row[] = [];
    for (let offset = 0; offset < ids.length; offset += 1000) {
      const { data: batch, error: batchError } = await context.sb
        .from("orders")
        .select(
          "id, human_id, placed_at, address, subtotal, discount, shipping_fee, tax_amount, total, payment_method, payment_status, status, courier_name, tracking_number, refunded_total, order_items(name_snapshot, qty)",
        )
        .in("id", ids.slice(offset, offset + 1000));
      if (batchError) throw new Error(batchError.message);
      rows.push(...((batch ?? []) as Row[]));
    }
    const byId = new Map(rows.map((row) => [String(row["id"]), row]));
    const body = ids.flatMap((id) => {
      const row = byId.get(id);
      if (!row) return [];
      const items = (row["order_items"] ?? []) as Row[];
      const address = (row["address"] ?? {}) as Row;
      return [
        [
          row["human_id"],
          csvDateTime(row["placed_at"]),
          address["name"] ?? "Customer",
          address["phone"] ?? "",
          items.map((item) => item["name_snapshot"]).join(" | "),
          items.reduce((sum, item) => sum + Number(item["qty"] ?? 0), 0),
          Number(row["subtotal"] ?? 0),
          Number(row["discount"] ?? 0),
          Number(row["shipping_fee"] ?? 0),
          Number(row["tax_amount"] ?? 0),
          Number(row["total"] ?? 0),
          row["payment_method"] ?? "",
          row["payment_status"],
          row["status"],
          row["courier_name"] ?? "",
          row["tracking_number"] ?? "",
          Number(row["refunded_total"] ?? 0),
        ],
      ];
    });
    return finish(
      context,
      "orders",
      data,
      result(
        "orders",
        [
          "Order number",
          "Date and time",
          "Customer",
          "Phone",
          "Items",
          "Total quantity",
          "Subtotal",
          "Discount",
          "Shipping",
          "Tax",
          "Total",
          "Payment method",
          "Payment status",
          "Order status",
          "Courier",
          "Tracking",
          "Refunded amount",
        ],
        body,
        (idRows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportCustomersCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string; from?: string; to?: string } | undefined) => ({
    q: clean(data?.q),
    ...dateInput(data),
  }))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    const { data: rows, error } = await context.sb.rpc("manage_customer_page", {
      p_query: data.q,
      p_offset: 0,
      p_limit: CSV_EXPORT_LIMIT + 1,
    });
    if (error) throw new Error(error.message);
    let selected = ((rows ?? []) as Row[]).slice(0, CSV_EXPORT_LIMIT);
    if (data.from || data.to) {
      const ids = selected.map((row) => String(row["id"]));
      const created = new Map<string, string>();
      for (let offset = 0; offset < ids.length; offset += 1000) {
        const { data: profiles, error: profileError } = await context.sb
          .from("profiles")
          .select("id, created_at")
          .in("id", ids.slice(offset, offset + 1000));
        if (profileError) throw new Error(profileError.message);
        for (const profile of profiles ?? [])
          created.set(String(profile.id), String(profile.created_at));
      }
      selected = selected.filter((row) => {
        const day = created.get(String(row["id"]))?.slice(0, 10) ?? "";
        return (!data.from || day >= data.from) && (!data.to || day <= data.to);
      });
    }
    const body = selected.map((row) => [
      row["name"],
      row["phone"],
      row["email"],
      row["customer_type"],
      row["price_tier"],
      Number(row["spend"] ?? 0),
      Number(row["order_count"] ?? 0),
      csvDateTime(row["last_order_at"]),
    ]);
    return finish(
      context,
      "customers",
      data,
      result(
        "customers",
        [
          "Name",
          "Phone",
          "Email",
          "Type",
          "Price tier",
          "Total spend",
          "Order count",
          "Last order",
        ],
        body,
        (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportEnquiriesCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string; from?: string; to?: string } | undefined) => ({
    status: clean(data?.status || "new", 30),
    ...dateInput(data),
  }))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    let query = context.sb
      .from("product_enquiries")
      .select("created_at, product_name, name, phone, qty, vehicle, note, status, handled_by")
      .order("created_at", { ascending: false })
      .range(0, CSV_EXPORT_LIMIT);
    if (data.status !== "all") query = query.eq("status", data.status);
    query = applyDateRange(query, "created_at", data);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const selected = ((rows ?? []) as Row[]).slice(0, CSV_EXPORT_LIMIT);
    return finish(
      context,
      "enquiries",
      data,
      result(
        "enquiries",
        [
          "Date",
          "Product",
          "Customer",
          "Phone",
          "Quantity",
          "Vehicle",
          "Note",
          "Status",
          "Handler",
        ],
        selected.map((row) => [
          csvDateTime(row["created_at"]),
          row["product_name"],
          row["name"],
          row["phone"],
          Number(row["qty"]),
          row["vehicle"],
          row["note"],
          row["status"],
          row["handled_by"],
        ]),
        (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportBookingsCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string; from?: string; to?: string } | undefined) => ({
    status: clean(data?.status || "open", 30),
    ...dateInput(data),
  }))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    let query = context.sb
      .from("vehicle_bookings")
      .select(
        "human_id, created_at, customer_name, phone, sale_kind, discount_amount, on_road_total, token_amount, balance_due, status, payment_status, expected_delivery, products(name), vehicle_registrations(chassis_number, motor_number, registration_number)",
      )
      .order("created_at", { ascending: false })
      .range(0, CSV_EXPORT_LIMIT);
    if (data.status === "open") query = query.not("status", "in", "(delivered,cancelled)");
    else if (data.status === "needs_review") query = query.eq("needs_payment_review", true);
    else if (data.status === "unpaid_48h")
      query = query
        .eq("sale_kind", "online")
        .neq("payment_status", "paid")
        .neq("status", "cancelled")
        .lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
    else query = query.eq("status", data.status as never);
    query = applyDateRange(query, "created_at", data);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const selected = ((rows ?? []) as Row[]).slice(0, CSV_EXPORT_LIMIT);
    return finish(
      context,
      "bookings",
      data,
      result(
        "bookings",
        [
          "Booking number",
          "Date",
          "Model",
          "Customer",
          "Phone",
          "Sale kind",
          "Discount amount",
          "On-road total",
          "Token paid",
          "Balance due",
          "Status",
          "Payment status",
          "Expected delivery",
          "Chassis",
          "Motor",
          "Registration",
        ],
        selected.map((row) => {
          const reg =
            (Array.isArray(row["vehicle_registrations"])
              ? row["vehicle_registrations"][0]
              : row["vehicle_registrations"]) ?? {};
          return [
            row["human_id"],
            csvDateTime(row["created_at"]),
            row["products"]?.["name"],
            row["customer_name"],
            row["phone"],
            row["sale_kind"],
            Number(row["discount_amount"] ?? 0),
            Number(row["on_road_total"]),
            Number(row["token_amount"]),
            Number(row["balance_due"]),
            row["status"],
            row["payment_status"],
            row["expected_delivery"],
            reg["chassis_number"],
            reg["motor_number"],
            reg["registration_number"],
          ];
        }),
        (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportReviewsCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string; from?: string; to?: string } | undefined) => ({
    status: clean(data?.status || "pending", 30),
    ...dateInput(data),
  }))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    let query = context.sb
      .from("reviews")
      .select(
        "created_at, rating, title, body, status, staff_reply, products(name), profiles(full_name, phone)",
      )
      .order("created_at", { ascending: false })
      .range(0, CSV_EXPORT_LIMIT);
    if (data.status !== "all") query = query.eq("status", data.status as never);
    query = applyDateRange(query, "created_at", data);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const selected = ((rows ?? []) as Row[]).slice(0, CSV_EXPORT_LIMIT);
    return finish(
      context,
      "reviews",
      data,
      result(
        "reviews",
        ["Date", "Product", "Rating", "Customer", "Title", "Body", "Status", "Staff reply"],
        selected.map((row) => [
          csvDateTime(row["created_at"]),
          row["products"]?.["name"],
          Number(row["rating"]),
          row["profiles"]?.["full_name"] ?? row["profiles"]?.["phone"],
          row["title"],
          row["body"],
          row["status"],
          row["staff_reply"],
        ]),
        (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

const productInput = (
  data:
    | {
        q?: string;
        category?: string;
        status?: string;
        filter?: string;
        from?: string;
        to?: string;
      }
    | undefined,
) => ({
  q: clean(data?.q),
  category: clean(data?.category, 80),
  status: clean(data?.status, 30),
  filter: clean(data?.filter || "all", 30),
  ...dateInput(data),
});
async function productExport(data: ReturnType<typeof productInput>, dataset: string) {
  const context = await (await import("@/lib/csv.server")).csvExportContext();
  let query = context.sb
    .from("products")
    .select(
      "sku, name, brand, mrp, price, stock, status, hsn_code, rack_location, reorder_threshold, created_at, categories!inner(name, slug), product_images(id)",
    )
    .order("name")
    .range(0, CSV_EXPORT_LIMIT);
  query = applyDateRange(query, "created_at", data);
  if (data.q) {
    const term = data.q.replace(/[%,()]/g, " ");
    query = query.or(
      `name.ilike.%${term}%,sku.ilike.%${term}%,brand.ilike.%${term}%,model.ilike.%${term}%,rack_location.ilike.%${term}%`,
    );
  }
  if (data.category) query = query.eq("categories.slug", data.category);
  if (data.status) query = query.eq("status", data.status as never);
  if (data.filter === "no-price") query = query.is("price", null);
  else if (data.filter === "no-stock") query = query.eq("stock", 0);
  else if (["visible", "draft", "hidden"].includes(data.filter))
    query = query.eq("status", data.filter as never);
  else if (data.filter === "no-rack") query = query.is("rack_location", null);
  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  let filtered = (rows ?? []) as Row[];
  if (data.filter === "no-photo")
    filtered = filtered.filter((row) => ((row["product_images"] ?? []) as Row[]).length === 0);
  if (data.filter === "low-stock")
    filtered = filtered.filter(
      (row) => Number(row["stock"]) <= Number(row["reorder_threshold"] ?? 3),
    );
  const selected = filtered.slice(0, CSV_EXPORT_LIMIT);
  return finish(
    context,
    dataset,
    data,
    result(
      dataset,
      [
        "SKU",
        "Name",
        "Brand",
        "Category",
        "MRP",
        "Price",
        "Stock",
        "Status",
        "HSN",
        "Rack location",
      ],
      selected.map((row) => [
        row["sku"],
        row["name"],
        row["brand"],
        row["categories"]?.["name"],
        row["mrp"] == null ? "" : Number(row["mrp"]),
        row["price"] == null ? "" : Number(row["price"]),
        Number(row["stock"]),
        row["status"],
        row["hsn_code"],
        row["rack_location"],
      ]),
      filtered.length > CSV_EXPORT_LIMIT || (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
    ),
  );
}
export const exportAllProductsCsv = createServerFn({ method: "POST" })
  .inputValidator(productInput)
  .handler(({ data }) => productExport(data, "all-products"));
export const exportStockProductsCsv = createServerFn({ method: "POST" })
  .inputValidator(productInput)
  .handler(({ data }) => productExport(data, "products-stock"));

export const exportVendorTransactionsCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { vendorId?: string; from?: string; to?: string } | undefined) => ({
    vendorId: clean(data?.vendorId, 40),
    ...dateInput(data),
  }))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    let query = context.sb
      .from("vendor_payments")
      .select(
        "vendor_id, paid_on, amount, reference, note, linked_ledger_id, created_by_name, qr_vendors(name)",
      )
      .is("voided_at", null)
      .order("paid_on", { ascending: false })
      .range(0, CSV_EXPORT_LIMIT);
    if (data.vendorId) query = query.eq("vendor_id", data.vendorId);
    if (data.from) query = query.gte("paid_on", data.from);
    if (data.to) query = query.lte("paid_on", data.to);
    const { data: payments, error } = await query;
    if (error) throw new Error(error.message);
    const rows = ((payments ?? []) as Row[])
      .map((row) => [
        row["paid_on"],
        row["qr_vendors"]?.["name"],
        row["linked_ledger_id"] ? "Vendor collection" : "Payout",
        Number(row["amount"]),
        row["reference"],
        row["note"],
        row["created_by_name"],
      ])
      .slice(0, CSV_EXPORT_LIMIT);
    return finish(
      context,
      "vendor-transactions",
      data,
      result(
        "vendor-transactions",
        ["Date", "Vendor", "Direction", "Amount", "Reference", "Note", "Recorded by"],
        rows,
        (payments?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportAuditCsv = createServerFn({ method: "POST" })
  .inputValidator(
    (
      data:
        | { q?: string; entityGroup?: string; dateRange?: string; from?: string; to?: string }
        | undefined,
    ) => ({
      q: clean(data?.q),
      entityGroup: clean(data?.entityGroup || "all", 30),
      dateRange: clean(data?.dateRange || "all", 10),
      ...dateInput(data),
    }),
  )
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    let query = context.sb
      .from("audit_log")
      .select("created_at, action, entity, actor")
      .order("created_at", { ascending: false })
      .range(0, CSV_EXPORT_LIMIT);
    if (data.q)
      query = query.or(
        `actor.ilike.%${data.q.replace(/[%,()]/g, " ")}%,action.ilike.%${data.q.replace(/[%,()]/g, " ")}%,entity.ilike.%${data.q.replace(/[%,()]/g, " ")}%`,
      );
    if (!data.from && data.dateRange !== "all")
      query = query.gte(
        "created_at",
        new Date(Date.now() - Number.parseInt(data.dateRange, 10) * 86400000).toISOString(),
      );
    query = applyDateRange(query, "created_at", data);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const selected = ((rows ?? []) as Row[])
      .filter(
        (row) =>
          data.entityGroup === "all" ||
          String(row["action"]).startsWith(
            data.entityGroup === "catalogue" ? "product" : data.entityGroup,
          ),
      )
      .slice(0, CSV_EXPORT_LIMIT);
    const parseActor = (actor: string) => {
      const match = actor.match(/^(.*?)\s*<([^>]+)>\s*\(([^)]+)\)$/);
      return match ? [match[1]?.trim() ?? "", match[2] ?? "", match[3] ?? ""] : [actor, "", ""];
    };
    return finish(
      context,
      "staff-activity",
      data,
      result(
        "staff-activity",
        ["Date", "Action", "Entity", "Actor name", "Actor email", "Role"],
        selected.map((row) => [
          csvDateTime(row["created_at"]),
          row["action"],
          row["entity"],
          ...parseActor(String(row["actor"] ?? "")),
        ]),
        (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportCounterSalesCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string; from?: string; to?: string } | undefined) => ({
    q: clean(data?.q),
    ...dateInput(data),
  }))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    let query = context.sb
      .from("counter_sales")
      .select(
        "order_id, invoice_kind, created_by_name, cancelled_at, created_at, orders!inner(human_id, total, tax_amount, credit_due_date), profiles!inner(full_name, phone)",
      )
      .order("created_at", { ascending: false })
      .range(0, CSV_EXPORT_LIMIT);
    if (data.q) {
      const term = data.q.replace(/[%,()]/g, " ");
      query = query.or(
        `orders.human_id.ilike.%${term}%,profiles.full_name.ilike.%${term}%,profiles.phone.ilike.%${term}%`,
      );
    }
    query = applyDateRange(query, "created_at", data);
    const { data: sales, error } = await query;
    if (error) throw new Error(error.message);
    const selected = ((sales ?? []) as Row[]).slice(0, CSV_EXPORT_LIMIT);
    const ids = selected.map((row) => row["order_id"]);
    const [{ data: items }, { data: payments }] = ids.length
      ? await Promise.all([
          context.sb.from("order_items").select("order_id, name_snapshot, qty").in("order_id", ids),
          context.sb
            .from("counter_sale_payments")
            .select("order_id, amount, status, voided_at")
            .in("order_id", ids),
        ])
      : [{ data: [] }, { data: [] }];
    const body = selected.map((row) => {
      const orderItems = ((items ?? []) as Row[]).filter(
        (item) => item["order_id"] === row["order_id"],
      );
      const paid = ((payments ?? []) as Row[])
        .filter(
          (payment) =>
            payment["order_id"] === row["order_id"] &&
            !payment["voided_at"] &&
            payment["status"] !== "bounced",
        )
        .reduce((sum, payment) => sum + Number(payment["amount"]), 0);
      const total = Number(row["orders"]?.["total"] ?? 0);
      return [
        row["orders"]?.["human_id"],
        csvDateTime(row["created_at"]),
        row["profiles"]?.["full_name"],
        row["profiles"]?.["phone"],
        row["invoice_kind"],
        orderItems.map((item) => `${item["name_snapshot"]} × ${item["qty"]}`).join(" | "),
        total,
        Number(row["orders"]?.["tax_amount"] ?? 0),
        paid,
        Math.max(0, total - paid),
        row["orders"]?.["credit_due_date"],
        row["created_by_name"],
        row["cancelled_at"] ? "Yes" : "No",
      ];
    });
    return finish(
      context,
      "counter-sales",
      data,
      result(
        "counter-sales",
        [
          "Invoice number",
          "Date and time",
          "Customer",
          "Phone",
          "Invoice kind",
          "Items",
          "Total",
          "Tax",
          "Paid",
          "Balance",
          "Due date",
          "Created by",
          "Cancelled",
        ],
        body,
        (sales?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportSuppliersCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string; from?: string; to?: string } | undefined) => ({
    q: clean(data?.q),
    ...dateInput(data),
  }))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    const { data: rows, error } = await context.sb.rpc("supplier_summary_page", {
      p_offset: 0,
      p_limit: CSV_EXPORT_LIMIT + 1,
      p_query: data.q,
    });
    if (error) throw new Error(error.message);
    const selected = ((rows ?? []) as Row[])
      .filter((row) => {
        const day = String(row["created_at"] ?? "").slice(0, 10);
        return (!data.from || day >= data.from) && (!data.to || day <= data.to);
      })
      .slice(0, CSV_EXPORT_LIMIT);
    return finish(
      context,
      "suppliers",
      data,
      result(
        "suppliers",
        [
          "Supplier",
          "Phone",
          "GSTIN",
          "Address",
          "Opening balance",
          "Total billed",
          "Total paid",
          "Outstanding",
          "Payment terms days",
          "Last payment",
          "Active",
        ],
        selected.map((row) => [
          row["name"],
          row["phone"],
          row["gstin"],
          row["address"],
          Number(row["opening_balance"] ?? 0),
          Number(row["total_billed"] ?? 0),
          Number(row["total_paid"] ?? 0),
          Number(row["balance"] ?? 0),
          Number(row["payment_terms_days"] ?? 0),
          row["last_payment_on"],
          row["active"] ? "Yes" : "No",
        ]),
        (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportTradeApplicationsCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string; from?: string; to?: string } | undefined) => ({
    status: clean(data?.status || "pending", 30),
    ...dateInput(data),
  }))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    let query = context.sb
      .from("trade_applications")
      .select(
        "created_at, business_name, contact_person, phone, alternate_phone, gstin, pan, shop_address, requested_tier, status, reviewer, decision_note, profiles(price_tier, credit_limit, payment_terms_days)",
      )
      .order("created_at", { ascending: false })
      .range(0, CSV_EXPORT_LIMIT);
    if (data.status !== "all") query = query.eq("status", data.status as never);
    query = applyDateRange(query, "created_at", data);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const selected = ((rows ?? []) as Row[]).slice(0, CSV_EXPORT_LIMIT);
    return finish(
      context,
      "trade-applications",
      data,
      result(
        "trade-applications",
        [
          "Date",
          "Business",
          "Contact person",
          "Phone",
          "Alternate number",
          "GSTIN",
          "PAN",
          "Address",
          "Requested tier",
          "Approved tier",
          "Credit limit",
          "Payment terms days",
          "Status",
          "Reviewer",
          "Decision note",
        ],
        selected.map((row) => [
          csvDateTime(row["created_at"]),
          row["business_name"],
          row["contact_person"],
          row["phone"],
          row["alternate_phone"],
          row["gstin"],
          row["pan"],
          row["shop_address"],
          row["requested_tier"],
          row["profiles"]?.["price_tier"],
          Number(row["profiles"]?.["credit_limit"] ?? 0),
          Number(row["profiles"]?.["payment_terms_days"] ?? 0),
          row["status"],
          row["reviewer"],
          row["decision_note"],
        ]),
        (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });

export const exportTradeOutstandingCsv = createServerFn({ method: "POST" })
  .inputValidator((data: { from?: string; to?: string } | undefined) => dateInput(data))
  .handler(async ({ data }) => {
    const context = await (await import("@/lib/csv.server")).csvExportContext();
    const { data: rows, error } = await context.sb.rpc("manager_trade_outstanding_page", {
      p_offset: 0,
      p_limit: CSV_EXPORT_LIMIT + 1,
    });
    if (error) throw new Error(error.message);
    const selected = ((rows ?? []) as Row[])
      .filter((row) => {
        const due = String(row["oldest_due"] ?? "");
        return (!data.from || due >= data.from) && (!data.to || due <= data.to);
      })
      .slice(0, CSV_EXPORT_LIMIT);
    return finish(
      context,
      "trade-outstanding",
      data,
      result(
        "trade-outstanding",
        ["Customer", "Phone", "Outstanding", "Credit limit", "Oldest due", "Overdue"],
        selected.map((row) => [
          row["name"],
          row["phone"],
          Number(row["balance"] ?? 0),
          Number(row["credit_limit"] ?? 0),
          row["oldest_due"],
          row["overdue"] ? "Yes" : "No",
        ]),
        (rows?.length ?? 0) > CSV_EXPORT_LIMIT,
      ),
    );
  });
