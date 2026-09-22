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
  items: { name: string; qty: number; price: number | null }[];
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
        "id, human_id, public_token, status, total, payment_method, payment_status, shipping_method, address, placed_at, order_items(name_snapshot, price_snapshot, qty)",
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
    sb.from("products").select("id, price, stock, product_images(url)").eq("is_active", true).limit(2000),
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
  gstEnabled: boolean;
  gstRate: number;
  pricesIncludeGst: boolean;
  gstin: string;
  legalName: string;
  billingAddress: string;
  codEnabled: boolean;
  codLimit: number;
  codPincodes: string;
  onlinePayments: boolean;
};

/** Shop-wide payment, GST and cash-on-delivery settings. */
export const getShopSettings = createServerFn({ method: "POST" }).handler(async (): Promise<ShopSettingsRow> => {
  const sb = await admin();
  const { data } = await sb.from("shop_settings").select("*").maybeSingle();
  const { razorpayKeys } = await import("@/lib/razorpay.server");
  return {
    gstEnabled: Boolean(data?.gst_enabled ?? true),
    gstRate: Number(data?.gst_rate ?? 18),
    pricesIncludeGst: Boolean(data?.prices_include_gst ?? true),
    gstin: String(data?.gstin ?? ""),
    legalName: String(data?.legal_name ?? ""),
    billingAddress: String(data?.billing_address ?? ""),
    codEnabled: Boolean(data?.cod_enabled ?? true),
    codLimit: Number(data?.cod_limit ?? 2000),
    codPincodes: ((data?.cod_pincodes ?? []) as string[]).join(", "),
    onlinePayments: razorpayKeys().configured,
  };
});

export const saveShopSettings = createServerFn({ method: "POST" })
  .inputValidator((data: Omit<ShopSettingsRow, "onlinePayments">) => data)
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const pincodes = String(data.codPincodes ?? "")
      .split(/[^0-9]+/)
      .filter((p) => /^\d{6}$/.test(p));
    const patch = {
      id: true,
      gst_enabled: Boolean(data.gstEnabled),
      gst_rate: Math.max(0, Math.min(50, Number(data.gstRate) || 0)),
      prices_include_gst: Boolean(data.pricesIncludeGst),
      gstin: String(data.gstin ?? "").trim().toUpperCase() || null,
      legal_name: String(data.legalName ?? "").trim() || null,
      billing_address: String(data.billingAddress ?? "").trim() || null,
      cod_enabled: Boolean(data.codEnabled),
      cod_limit: Math.max(0, Number(data.codLimit) || 0),
      cod_pincodes: pincodes,
    };
    const { error } = await sb.from("shop_settings").upsert(patch);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb, actor, "settings.updated", "shop_settings", "1", patch as never);
    return { ok: true as const };
  });

/** Turn GST on or off for one order (and set its rate), recomputing the tax. */
export const setOrderGst = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; enabled: boolean; rate?: number }) => ({
    orderId: String(data?.orderId ?? ""),
    enabled: Boolean(data?.enabled),
    rate: data?.rate === undefined ? null : Math.max(0, Math.min(50, Number(data.rate) || 0)),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const { error } = await sb.rpc("set_order_gst", {
      p_order_id: data.orderId,
      p_enabled: data.enabled,
      p_rate: data.rate,
    });
    if (error) return { ok: false as const, error: error.message };
    await logAudit(sb, actor, "order.gst_changed", "orders", data.orderId, data as never);
    return { ok: true as const };
  });
