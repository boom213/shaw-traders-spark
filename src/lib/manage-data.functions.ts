import { createServerFn } from "@tanstack/react-start";
import type { OrderStatus, Product } from "@/lib/catalog";

type Row = Record<string, any>;

export type ManageOrder = {
  id: string;
  humanId: string;
  token: string;
  status: OrderStatus;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  shippingMethod: string | null;
  address: Record<string, string>;
  placedAt: string;
  items: { name: string; qty: number; price: number | null; rackLocation: string | null; image: string | null }[];
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  refunded: number;
  requests: { id: string; kind: string; reason: string; details: string | null; status: string; createdAt: string }[];
};

const mapManageOrder = (row: Row): ManageOrder => ({
  id: String(row['id']),
  humanId: String(row['human_id']),
  token: String(row['public_token']),
  status: row['status'] as OrderStatus,
  total: Number(row['total']),
  paymentMethod: row['payment_method'] ?? null,
  paymentStatus: String(row['payment_status']),
  shippingMethod: row['shipping_method'] ?? null,
  address: (row['address'] ?? {}) as Record<string, string>,
  placedAt: String(row['placed_at']),
  items: ((row['order_items'] ?? []) as Row[]).map((i) => ({
    name: String(i['name_snapshot']),
    qty: Number(i['qty']),
    price: i['price_snapshot'] === null || i['price_snapshot'] === undefined ? null : Number(i['price_snapshot']),
    rackLocation: (i['products'] as Row | null)?.['rack_location'] ?? null,
    image: i['image_snapshot'] ? String(i['image_snapshot']) : null,
  })),
  courierName: row['courier_name'] ?? null,
  trackingNumber: row['tracking_number'] ?? null,
  trackingUrl: row['tracking_url'] ?? null,
  refunded: Number(row['refunded_total'] ?? 0),
  requests: ((row['order_requests'] ?? []) as Row[]).map((r) => ({
    id: String(r['id']),
    kind: String(r['kind']),
    reason: String(r['reason']),
    details: r['details'] ?? null,
    status: String(r['status']),
    createdAt: String(r['created_at']),
  })),
});

async function admin() {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Admin client plus the signed-in staff member, for changes that must be audited. */
async function adminAs() {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { sb: supabaseAdmin, actor, logAudit };
}

export const manageOrders = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string } | undefined) => ({ q: String(data?.q ?? "").trim() }))
  .handler(async ({ data }): Promise<ManageOrder[]> => {
    const sb = await admin();
    let query = sb
      .from("orders")
      .select(
        "id, human_id, public_token, status, total, payment_method, payment_status, shipping_method, address, placed_at, courier_name, tracking_number, tracking_url, refunded_total, order_items(name_snapshot, price_snapshot, qty, image_snapshot, products(rack_location)), order_requests(id, kind, reason, details, status, created_at)",
      )
      .order("placed_at", { ascending: false })
      .limit(300);
    if (data.q) {
      const t = data.q.replace(/[%,()]/g, " ");
      query = query.or(`human_id.ilike.%${t}%,contact_phone.ilike.%${t}%,address->>name.ilike.%${t}%`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapManageOrder);
  });

export const setOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: OrderStatus }) => ({
    id: String(data?.id ?? ""),
    status: String(data?.status ?? "") as OrderStatus,
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const { data: before } = await sb.from("orders").select("status, human_id").eq("id", data.id).maybeSingle();
    const { error } = await sb.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await sb.from("order_events").insert({ order_id: data.id, status: data.status, created_by: actor.name });
    await logAudit(sb as never, actor, "order.status_changed", "orders", data.id, {
      order: before?.human_id ?? data.id,
      from: before?.status ?? null,
      to: data.status,
    });
    const { notifyOrderStatus } = await import("@/lib/notify.server");
    await notifyOrderStatus(data.id, data.status);
    return { ok: true as const };
  });

export type ManageCustomer = {
  phone: string;
  name: string;
  email?: string;
  city?: string;
  orders: { humanId: string; token: string }[];
  spend: number;
  last: string;
};

export const manageCustomers = createServerFn({ method: "POST" })
  .inputValidator((data: { q?: string } | undefined) => ({ q: String(data?.q ?? "").trim().toLowerCase() }))
  .handler(async ({ data }): Promise<ManageCustomer[]> => {
    const sb = await admin();
    const { data: rows, error } = await sb
      .from("orders")
      .select("human_id, public_token, total, address, contact_phone, placed_at")
      .order("placed_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const map = new Map<string, ManageCustomer>();
    for (const o of (rows ?? []) as Row[]) {
      const addr = (o['address'] ?? {}) as Record<string, string>;
      const phone = String(o['contact_phone'] ?? addr['phone'] ?? "unknown");
      const entry = map.get(phone);
      const ref = { humanId: String(o['human_id']), token: String(o['public_token']) };
      if (entry) {
        entry.orders.push(ref);
        entry.spend += Number(o['total']);
        if (String(o['placed_at']) > entry.last) entry.last = String(o['placed_at']);
      } else {
        map.set(phone, {
          phone,
          name: addr['name'] ?? "Customer",
          ...(addr['email'] ? { email: addr['email'] } : {}),
          ...(addr['city'] ? { city: addr['city'] } : {}),
          orders: [ref],
          spend: Number(o['total']),
          last: String(o['placed_at']),
        });
      }
    }
    const list = [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
    return data.q
      ? list.filter((c) => `${c.name} ${c.phone} ${c.city ?? ""}`.toLowerCase().includes(data.q))
      : list;
  });

export const manageStats = createServerFn({ method: "POST" }).handler(async () => {
  const sb = await admin();
  const [products, orders, categories] = await Promise.all([
    sb.from("products").select("id, price, stock, product_images(url)").eq("status", "visible").limit(2000),
    sb.from("orders").select("total, contact_phone").limit(2000),
    sb.from("categories").select("id"),
  ]);
  const prod = (products.data ?? []) as Row[];
  const ords = (orders.data ?? []) as Row[];
  return {
    products: prod.length,
    categories: (categories.data ?? []).length,
    noPrice: prod.filter((p) => p['price'] === null).length,
    noPhoto: prod.filter((p) => ((p['product_images'] ?? []) as Row[]).length === 0).length,
    lowStock: prod.filter((p) => Number(p['stock']) > 0 && Number(p['stock']) <= 3).length,
    outOfStock: prod.filter((p) => Number(p['stock']) === 0).length,
    orders: ords.length,
    revenue: ords.reduce((n, o) => n + Number(o['total']), 0),
    customers: new Set(ords.map((o) => String(o['contact_phone'] ?? ""))).size,
  };
});

export const manageProducts = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { q?: string; category?: string; only?: string; page?: number } | undefined) => ({
      q: String(data?.q ?? "").trim(),
      category: String(data?.category ?? ""),
      only: String(data?.only ?? "all"),
      page: Math.max(0, Number(data?.page ?? 0)),
    }),
  )
  .handler(async ({ data }): Promise<{ items: Product[]; total: number }> => {
    const sb = await admin();
    const { PRODUCT_SELECT, mapProduct } = await import("@/lib/product-map");
    const size = 40;
    let query = sb.from("products").select(PRODUCT_SELECT, { count: "exact" });
    if (data.q) {
      const t = data.q.replace(/[%,()]/g, " ");
      query = query.or(`name.ilike.%${t}%,sku.ilike.%${t}%,brand.ilike.%${t}%,model.ilike.%${t}%`);
    }
    if (data.category) query = query.eq("categories.slug", data.category);
    if (data.only === "no-price") query = query.is("price", null);
    if (data.only === "no-stock") query = query.eq("stock", 0);
    const { data: rows, count, error } = await query
      .order("name")
      .range(data.page * size, data.page * size + size - 1);
    if (error) throw new Error(error.message);
    let items = (rows ?? []).map(mapProduct);
    if (data.only === "no-photo") items = items.filter((p) => p.images.length === 0);
    return { items, total: count ?? 0 };
  });

export const saveProducts = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      updates: { id: string; price?: number | null; mrp?: number | null; stock?: number; brand?: string | null; image?: string }[];
    }) => ({ updates: Array.isArray(data?.updates) ? data.updates.slice(0, 200) : [] }),
  )
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const ids = data.updates.map((u) => u.id);
    const { data: before } = await sb.from("products").select("id, name, price, mrp, stock, brand").in("id", ids);
    const beforeById = new Map((before ?? []).map((b) => [String(b.id), b]));
    const changes: Record<string, unknown>[] = [];
    for (const u of data.updates) {
      const patch: Record<string, unknown> = {};
      if (u.price !== undefined) patch['price'] = u.price;
      if (u.mrp !== undefined) patch['mrp'] = u.mrp;
      if (u.stock !== undefined) patch['stock'] = u.stock;
      if (u.brand !== undefined) patch['brand'] = u.brand;
      const prev = beforeById.get(u.id);
      if (Object.keys(patch).length > 0) {
        await sb.from("products").update(patch as never).eq("id", u.id);
        changes.push({ product: prev?.name ?? u.id, id: u.id, from: prev ?? null, to: patch });
      }
      if (u.image !== undefined) {
        await sb.from("product_images").delete().eq("product_id", u.id).eq("sort_order", 0);
        if (u.image.trim()) {
          await sb.from("product_images").insert({ product_id: u.id, url: u.image.trim(), sort_order: 0 });
        }
      }
    }
    await logAudit(sb as never, actor, "products.updated", "products", null, {
      count: data.updates.length,
      changes: changes.slice(0, 50),
    });
    return { saved: data.updates.length };
  });

export type ShopSettingsRow = {
  orderingMode: string;
  browseBanner: string;
  gstEnabled: boolean;
  gstRate: number;
  pricesIncludeGst: boolean;
  gstin: string;
  legalName: string;
  billingAddress: string;
  codEnabled: boolean;
  codLimit: number;
  codPincodes: string;
  ownerWhatsapp: string;
  ownerEmail: string;
  notifyEnabled: boolean;
  defaultHsn: string;
  lowStockThreshold: number;
  supportEmail: string;
  grievanceName: string;
  grievanceEmail: string;
  grievancePhone: string;
  onlinePayments: boolean;
  whatsappReady: boolean;
  /** Only a super admin may change ordering mode, GST and payment settings. */
  isSuperAdmin: boolean;
};

/** Shop-wide payment, GST and cash-on-delivery settings. */
export const getShopSettings = createServerFn({ method: "POST" }).handler(async (): Promise<ShopSettingsRow> => {
  const sb = await admin();
  const { data } = await sb.from("shop_settings").select("*").maybeSingle();
  const { razorpayKeys } = await import("@/lib/razorpay.server");
  const { staffContext } = await import("@/lib/staff.server");
  const ctx = await staffContext();
  return {
    orderingMode: String(data?.ordering_mode ?? "full"),
    browseBanner: String(data?.browse_banner ?? ""),
    gstEnabled: Boolean(data?.gst_enabled ?? true),
    gstRate: Number(data?.gst_rate ?? 18),
    pricesIncludeGst: Boolean(data?.prices_include_gst ?? true),
    gstin: String(data?.gstin ?? ""),
    legalName: String(data?.legal_name ?? ""),
    billingAddress: String(data?.billing_address ?? ""),
    codEnabled: Boolean(data?.cod_enabled ?? true),
    codLimit: Number(data?.cod_limit ?? 2000),
    codPincodes: ((data?.cod_pincodes ?? []) as string[]).join(", "),
    ownerWhatsapp: String(data?.owner_whatsapp ?? "7501849610"),
    ownerEmail: String(data?.owner_email ?? ""),
    notifyEnabled: Boolean(data?.notify_enabled ?? true),
    defaultHsn: String(data?.default_hsn ?? "8507"),
    lowStockThreshold: Number(data?.low_stock_threshold ?? 3),
    supportEmail: String(data?.support_email ?? ""),
    grievanceName: String(data?.grievance_officer_name ?? ""),
    grievanceEmail: String(data?.grievance_officer_email ?? ""),
    grievancePhone: String(data?.grievance_officer_phone ?? ""),
    onlinePayments: razorpayKeys().configured,
    whatsappReady: (await import("@/lib/whatsapp.server")).whatsappConfigured(),
    isSuperAdmin: ctx?.role === "super_admin",
  };
});

export const saveShopSettings = createServerFn({ method: "POST" })
  .inputValidator((data: Omit<ShopSettingsRow, "onlinePayments" | "whatsappReady" | "isSuperAdmin">) => data)
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const pincodes = String(data.codPincodes ?? "")
      .split(/[^0-9]+/)
      .filter((p) => /^\d{6}$/.test(p));
    const superAdmin = actor.role === "super_admin";
    const current = (await sb.from("shop_settings").select("*").maybeSingle()).data as Row | null;

    // Ordering mode and GST are super-admin only; everyone else keeps the saved values.
    const sensitive = superAdmin
      ? {
          ordering_mode: ["full", "enquiry", "browse"].includes(String(data.orderingMode)) ? String(data.orderingMode) : "full",
          browse_banner: String(data.browseBanner ?? "").trim().slice(0, 300) || null,
          gst_enabled: Boolean(data.gstEnabled),
          gst_rate: Math.max(0, Math.min(50, Number(data.gstRate) || 0)),
          prices_include_gst: Boolean(data.pricesIncludeGst),
          gstin: String(data.gstin ?? "").trim().toUpperCase() || null,
        }
      : {
          ordering_mode: current?.['ordering_mode'] ?? "full",
          browse_banner: current?.['browse_banner'] ?? null,
          gst_enabled: current?.['gst_enabled'] ?? true,
          gst_rate: current?.['gst_rate'] ?? 18,
          prices_include_gst: current?.['prices_include_gst'] ?? true,
          gstin: current?.['gstin'] ?? null,
        };

    const patch = {
      id: true,
      ...sensitive,
      legal_name: String(data.legalName ?? "").trim() || null,
      billing_address: String(data.billingAddress ?? "").trim() || null,
      cod_enabled: Boolean(data.codEnabled),
      cod_limit: Math.max(0, Number(data.codLimit) || 0),
      cod_pincodes: pincodes,
      owner_whatsapp: String(data.ownerWhatsapp ?? "").replace(/\D/g, "").slice(-12) || "7501849610",
      owner_email: String(data.ownerEmail ?? "").trim() || null,
      notify_enabled: Boolean(data.notifyEnabled),
      default_hsn: String(data.defaultHsn ?? "").trim() || "8507",
      low_stock_threshold: Math.max(0, Math.min(99, Number(data.lowStockThreshold) || 3)),
      support_email: String(data.supportEmail ?? "").trim() || null,
      grievance_officer_name: String(data.grievanceName ?? "").trim() || null,
      grievance_officer_email: String(data.grievanceEmail ?? "").trim() || null,
      grievance_officer_phone: String(data.grievancePhone ?? "").replace(/[^\d+]/g, "") || null,
    };
    const { error } = await sb.from("shop_settings").upsert(patch);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb, actor, "settings.updated", "shop_settings", "1", patch as never);
    if (superAdmin && String(current?.['ordering_mode'] ?? "full") !== sensitive.ordering_mode) {
      await logAudit(sb, actor, "settings.ordering_mode", "shop_settings", "1", {
        from: current?.['ordering_mode'] ?? "full",
        to: sensitive.ordering_mode,
      } as never);
    }
    return { ok: true as const };
  });

/** Turn GST on or off for one order (and set its rate), recomputing the tax. */
export const setOrderGst = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; enabled: boolean; rate?: number }) => ({
    orderId: String(data?.orderId ?? ""),
    enabled: Boolean(data?.enabled),
    rate: data?.rate === undefined ? 0 : Math.max(0, Math.min(50, Number(data.rate) || 0)),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const { error } = await sb.rpc("set_order_gst", {
      p_order_id: data.orderId,
      p_enabled: data.enabled,
      p_rate: data.rate ?? 0,
    });
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb, actor, "order.gst_changed", "orders", data.orderId, data as never);
    return { ok: true as const };
  });

/** Courier name and tracking number for a dispatched order. */
export const setTracking = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; courier: string; trackingNumber: string; trackingUrl?: string; markShipped?: boolean }) => ({
    id: String(data?.id ?? ""),
    courier: String(data?.courier ?? "").trim().slice(0, 80),
    trackingNumber: String(data?.trackingNumber ?? "").trim().slice(0, 80),
    trackingUrl: String(data?.trackingUrl ?? "").trim().slice(0, 300),
    markShipped: data?.markShipped !== false,
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    if (!data.courier || !data.trackingNumber) return { ok: false as const, error: "Add both the courier and the tracking number." };

    const patch: Record<string, unknown> = {
      courier_name: data.courier,
      tracking_number: data.trackingNumber,
      tracking_url: data.trackingUrl || null,
      shipped_at: new Date().toISOString(),
    };
    if (data.markShipped) patch['status'] = "shipped";
    const { error } = await sb.from("orders").update(patch as never).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };

    await sb.from("order_events").insert({
      order_id: data.id,
      status: (data.markShipped ? "shipped" : "packed") as never,
      note: `${data.courier} · ${data.trackingNumber}`,
      created_by: actor.name,
    } as never);
    await logAudit(sb as never, actor, "order.tracking_added", "orders", data.id, patch);

    const { notifyOrderStatus } = await import("@/lib/notify.server");
    await notifyOrderStatus(data.id, data.markShipped ? "shipped" : "packed");
    return { ok: true as const };
  });

/** Approve or decline a cancellation / return request. */
export const decideOrderRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { requestId: string; approve: boolean; note?: string }) => ({
    requestId: String(data?.requestId ?? ""),
    approve: Boolean(data?.approve),
    note: String(data?.note ?? "").trim().slice(0, 300),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const { data: req } = await sb
      .from("order_requests")
      .select("id, order_id, kind, status")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!req) return { ok: false as const, error: "Request not found." };
    if (req.status !== "pending") return { ok: false as const, error: "This request was already answered." };

    await sb
      .from("order_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        decided_by: actor.name,
        decided_at: new Date().toISOString(),
        decision_note: data.note || null,
      } as never)
      .eq("id", req.id);

    if (data.approve) {
      const next = req.kind === "return" ? "returned" : "cancelled";
      await sb
        .from("orders")
        .update({
          status: next as never,
          ...(req.kind === "return" ? { return_reason: data.note || null } : { cancel_reason: data.note || null }),
        } as never)
        .eq("id", req.order_id);
      await sb.from("order_events").insert({
        order_id: req.order_id,
        status: next as never,
        note: `${req.kind === "return" ? "Return" : "Cancellation"} approved${data.note ? ` — ${data.note}` : ""}`,
        created_by: actor.name,
      } as never);
      if (req.kind === "cancellation") {
        await sb.rpc("release_order", { p_order_id: req.order_id, p_reason: "Cancelled at the customer's request" });
      }
    }

    await logAudit(sb as never, actor, `order.${req.kind}_${data.approve ? "approved" : "rejected"}`, "orders", req.order_id, {
      note: data.note,
    });
    const { notifyRequestDecision } = await import("@/lib/notify.server");
    await notifyRequestDecision(String(req.order_id), String(req.kind), data.approve, data.note);
    return { ok: true as const };
  });

/** Record a refund against the payment (through Razorpay when it was paid online). */
export const recordRefund = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; amount: number; note?: string; viaRazorpay?: boolean }) => ({
    orderId: String(data?.orderId ?? ""),
    amount: Math.max(0, Number(data?.amount) || 0),
    note: String(data?.note ?? "").trim().slice(0, 300),
    viaRazorpay: data?.viaRazorpay !== false,
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    if (data.amount <= 0) return { ok: false as const, error: "Enter the refund amount." };

    const { data: order } = await sb
      .from("orders")
      .select("id, human_id, total, refunded_total, payment_status, provider_payment_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { ok: false as const, error: "Order not found." };
    const already = Number(order.refunded_total ?? 0);
    if (already + data.amount > Number(order.total) + 0.01) {
      return { ok: false as const, error: `Only ${Number(order.total) - already} is left to refund on this order.` };
    }

    let method = "manual";
    let providerRefundId: string | null = null;
    if (data.viaRazorpay && order.payment_status === "paid" && order.provider_payment_id) {
      const { refundRazorpayPayment } = await import("@/lib/razorpay.server");
      const res = await refundRazorpayPayment(String(order.provider_payment_id), data.amount);
      if ("error" in res) return { ok: false as const, error: res.error };
      method = "razorpay";
      providerRefundId = res.refund.id;
    }

    await sb.from("refunds").insert({
      order_id: order.id,
      amount: data.amount,
      method,
      provider_refund_id: providerRefundId,
      provider_payment_id: order.provider_payment_id ?? null,
      status: "recorded",
      note: data.note || null,
      created_by: actor.name,
    } as never);

    const total = already + data.amount;
    await sb
      .from("orders")
      .update({
        refunded_total: total,
        ...(total >= Number(order.total) - 0.01 ? { payment_status: "refunded" as never } : {}),
      } as never)
      .eq("id", order.id);

    await sb.from("order_events").insert({
      order_id: order.id,
      status: "cancelled" as never,
      note: `Refund of ${data.amount} recorded (${method})${data.note ? ` — ${data.note}` : ""}`,
      created_by: actor.name,
    } as never);
    await logAudit(sb as never, actor, "order.refunded", "orders", order.id, { amount: data.amount, method, providerRefundId });

    const { notifyRefund } = await import("@/lib/notify.server");
    await notifyRefund(order.id, data.amount, method === "razorpay" ? "back to your original payment method" : "manually");
    return { ok: true as const };
  });

/** Invoice PDF for staff, by order id. */
export const staffInvoice = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data }) => {
    await admin();
    const { invoicePdfBase64 } = await import("@/lib/invoice.server");
    return invoicePdfBase64(data.orderId);
  });

/** Today's summary plus the last few messages the shop sent. */
export const dailySummaryPreview = createServerFn({ method: "POST" }).handler(async () => {
  const sb = await admin();
  const { buildDailySummary } = await import("@/lib/notify.server");
  const summary = await buildDailySummary(new Date());
  const { data: recent } = await sb
    .from("notifications")
    .select("kind, recipient, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(12);
  const { whatsappConfigured } = await import("@/lib/whatsapp.server");
  return {
    ...summary,
    whatsappReady: whatsappConfigured(),
    recent: (recent ?? []).map((n) => ({
      kind: String(n.kind),
      recipient: String(n.recipient),
      status: String(n.status),
      error: n.error ?? null,
      createdAt: String(n.created_at),
    })),
  };
});

/** Send today's summary to the owner right now. */
export const sendSummaryNow = createServerFn({ method: "POST" }).handler(async () => {
  const { actor } = await adminAs();
  const { sendDailySummary } = await import("@/lib/notify.server");
  const res = await sendDailySummary(new Date(), true);
  return { ok: true as const, day: res.day, by: actor.name };
});
