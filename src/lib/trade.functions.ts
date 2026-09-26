import { createServerFn } from "@tanstack/react-start";
import { BUSINESS_TYPES, STAFF_OPTIONS, VOLUME_OPTIONS, YEARS_OPTIONS, cleanList, pickOne, taxIdError } from "@/lib/trade-options";

export type TradeDocField =
  | "gst_certificate_path"
  | "shop_photo_path"
  | "address_proof_path"
  | "pan_card_path"
  | "trade_licence_path";

export const DOC_FIELDS: { field: TradeDocField; label: string; required: boolean }[] = [
  { field: "gst_certificate_path", label: "GST certificate", required: true },
  { field: "trade_licence_path", label: "Trade licence or Udyam registration (optional)", required: false },
];

export type MyTradeAccount = {
  signedIn: boolean;
  tier: "retail" | "trade" | "distributor";
  approved: boolean;
  creditLimit: number;
  paymentTermsDays: number;
  balance: number;
  overdue: boolean;
  application: {
    id: string;
    status: string;
    businessName: string;
    gstin: string | null;
    pan: string | null;
    shopAddress: string;
    contactPerson: string;
    phone: string;
    decisionNote: string | null;
    businessType: string;
    yearsInBusiness: string;
    staffCount: string;
    monthlyVolume: string;
    brands: string[];
    partCategories: string[];
    documents: Record<string, string | null>;
    createdAt: string;
  } | null;
};

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** The signed-in customer's trade status, application and credit position. */
export const myTradeAccount = createServerFn({ method: "POST" }).handler(async (): Promise<MyTradeAccount> => {
  const { tradeAccount, tradeBalance } = await import("@/lib/trade.server");
  const account = await tradeAccount();
  if (!account.userId) {
    return { signedIn: false, tier: "retail", approved: false, creditLimit: 0, paymentTermsDays: 0, balance: 0, overdue: false, application: null };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: app }, credit] = await Promise.all([
    supabaseAdmin
      .from("trade_applications")
      .select("*")
      .eq("profile_id", account.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tradeBalance(account.userId),
  ]);

  return {
    signedIn: true,
    tier: account.tier,
    approved: account.approved,
    creditLimit: account.creditLimit,
    paymentTermsDays: account.paymentTermsDays,
    balance: credit.balance,
    overdue: credit.overdue,
    application: app
      ? {
          id: String(app.id),
          status: String(app.status),
          businessName: String(app.business_name),
          gstin: app.gstin,
          pan: app.pan,
          shopAddress: String(app.shop_address),
          contactPerson: String(app.contact_person),
          phone: String(app.phone),
          decisionNote: app.decision_note,
          businessType: app.business_type ?? "",
          yearsInBusiness: app.years_in_business ?? "",
          staffCount: app.staff_count ?? "",
          monthlyVolume: app.monthly_volume ?? "",
          brands: app.brands ?? [],
          partCategories: app.part_categories ?? [],
          documents: Object.fromEntries(DOC_FIELDS.map((d) => [d.field, (app as unknown as Record<string, string | null>)[d.field] ?? null])),
          createdAt: String(app.created_at),
        }
      : null,
  };
});

/** Send or update a trade account application. Documents are uploaded separately. */
export const submitTradeApplication = createServerFn({ method: "POST" })
  .inputValidator((data: {
    businessName: string;
    gstin?: string;
    pan?: string;
    shopAddress: string;
    contactPerson: string;
    phone: string;
    documents?: Partial<Record<TradeDocField, string>>;
    businessType?: string;
    yearsInBusiness?: string;
    staffCount?: string;
    monthlyVolume?: string;
    brands?: string[];
    partCategories?: string[];
  }) => ({
    businessName: text(data?.businessName, 160),
    gstin: text(data?.gstin, 20).toUpperCase(),
    pan: text(data?.pan, 12).toUpperCase(),
    shopAddress: text(data?.shopAddress, 400),
    contactPerson: text(data?.contactPerson, 120),
    phone: String(data?.phone ?? "").replace(/\D/g, "").slice(-10),
    documents: (data?.documents ?? {}) as Partial<Record<TradeDocField, string>>,
    businessType: pickOne(data?.businessType, BUSINESS_TYPES),
    yearsInBusiness: pickOne(data?.yearsInBusiness, YEARS_OPTIONS),
    staffCount: pickOne(data?.staffCount, STAFF_OPTIONS),
    monthlyVolume: pickOne(data?.monthlyVolume, VOLUME_OPTIONS),
    brands: cleanList(data?.brands),
    partCategories: cleanList(data?.partCategories),
  }))
  .handler(async ({ data }) => {
    const { tradeAccount } = await import("@/lib/trade.server");
    const account = await tradeAccount();
    if (!account.userId) return { ok: false as const, message: "Please sign in first." };
    if (data.businessName.length < 3) return { ok: false as const, message: "Please give your business name." };
    if (data.shopAddress.length < 8) return { ok: false as const, message: "Please give your shop address." };
    if (data.phone.length !== 10) return { ok: false as const, message: "Enter a 10-digit mobile number." };
    if (!data.businessType) return { ok: false as const, message: "Please choose your business type." };
    if (!data.monthlyVolume) return { ok: false as const, message: "Please choose your monthly purchase estimate." };
    const taxErr = taxIdError(data.gstin, data.pan);
    if (taxErr) return { ok: false as const, message: taxErr };

    const docs: Record<string, string | null> = {};
    for (const d of DOC_FIELDS) {
      const value = data.documents[d.field];
      if (typeof value === "string" && value.startsWith(`${account.userId}/`)) docs[d.field] = value.slice(0, 300);
    }
    const missing = DOC_FIELDS.filter((d) => d.required && !docs[d.field]).map((d) => d.label);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("trade_applications")
      .select("id, status")
      .eq("profile_id", account.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const row = {
      profile_id: account.userId,
      business_name: data.businessName,
      gstin: data.gstin || null,
      pan: data.pan || null,
      shop_address: data.shopAddress,
      contact_person: data.contactPerson || data.businessName,
      phone: data.phone,
      business_type: data.businessType,
      years_in_business: data.yearsInBusiness || null,
      staff_count: data.staffCount || null,
      monthly_volume: data.monthlyVolume,
      brands: data.brands,
      part_categories: data.partCategories,
      status: "pending" as const,
      decision_note: null,
      ...docs,
    };

    if (missing.length > 0) {
      return { ok: false as const, message: `Please attach: ${missing.join(", ")}.` };
    }

    if (existing && existing.status !== "approved") {
      const { error } = await supabaseAdmin.from("trade_applications").update(row as never).eq("id", existing.id);
      if (error) return { ok: false as const, message: "Could not save your application. Please try again." };
    } else if (!existing) {
      await supabaseAdmin.from("profiles").upsert({ id: account.userId, customer_type: "trade" } as never);
      const { error } = await supabaseAdmin.from("trade_applications").insert(row as never);
      if (error) return { ok: false as const, message: "Could not send your application. Please try again." };
    } else {
      return { ok: false as const, message: "Your trade account is already approved." };
    }

    await supabaseAdmin.from("profiles").update({ customer_type: "trade" } as never).eq("id", account.userId);

    const { notifyTradeApplication } = await import("@/lib/trade-notify.server");
    await notifyTradeApplication(account.userId, data.businessName, { type: data.businessType, volume: data.monthlyVolume });
    return { ok: true as const, message: "Thank you — we will check your documents and call you." };
  });

/** Remove one uploaded identity document on request. */
export const deleteTradeDocument = createServerFn({ method: "POST" })
  .inputValidator((data: { field: TradeDocField }) => ({ field: String(data?.field) as TradeDocField }))
  .handler(async ({ data }) => {
    if (!DOC_FIELDS.some((d) => d.field === data.field)) return { ok: false as const };
    const { tradeAccount } = await import("@/lib/trade.server");
    const account = await tradeAccount();
    if (!account.userId) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: app } = await supabaseAdmin
      .from("trade_applications")
      .select("id, " + data.field)
      .eq("profile_id", account.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const path = (app as Record<string, string | null> | null)?.[data.field] ?? null;
    if (path) await supabaseAdmin.storage.from("trade-docs").remove([path]);
    if (app) await supabaseAdmin.from("trade_applications").update({ [data.field]: null } as never).eq("id", (app as unknown as { id: string }).id);
    return { ok: true as const };
  });

export type TradePriceLine = {
  productId: string;
  unitPrice: number | null;
  retailPrice: number | null;
  minOrderQty: number;
  orderMultiple: number;
};

/** Prices for the signed-in customer's own tier, resolved on the server. */
export const myPrices = createServerFn({ method: "POST" })
  .inputValidator((data: { items: { productId: string; qty?: number }[] }) => ({
    items: (data?.items ?? [])
      .map((i) => ({ productId: String(i.productId), qty: Math.max(1, Math.min(9999, Number(i.qty) || 1)) }))
      .filter((i) => /^[0-9a-f-]{36}$/i.test(i.productId))
      .slice(0, 100),
  }))
  .handler(async ({ data }): Promise<{ tier: string; lines: TradePriceLine[] }> => {
    const { tradeAccount, tierPrice } = await import("@/lib/trade.server");
    const account = await tradeAccount();
    if (data.items.length === 0) return { tier: account.tier, lines: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("products")
      .select("id, price, min_order_qty, order_multiple")
      .in("id", data.items.map((i) => i.productId));

    const lines = await Promise.all(
      data.items.map(async (item) => {
        const row = (rows ?? []).find((r) => r.id === item.productId);
        const unit = account.tier === "retail" ? (row?.price ?? null) : await tierPrice(item.productId, account.tier, item.qty);
        return {
          productId: item.productId,
          unitPrice: unit === null ? null : Number(unit),
          retailPrice: row?.price === null || row?.price === undefined ? null : Number(row.price),
          minOrderQty: Math.max(1, Number(row?.min_order_qty ?? 1)),
          orderMultiple: Math.max(1, Number(row?.order_multiple ?? 1)),
        };
      }),
    );
    return { tier: account.tier, lines };
  });

export type PadLine = {
  input: string;
  qty: number;
  productId: string | null;
  name: string | null;
  slug: string | null;
  sku: string | null;
  unitPrice: number | null;
  stock: number;
  problem: string | null;
};

/** Bulk order pad: turn pasted part numbers and quantities into cart lines. */
export const bulkLookup = createServerFn({ method: "POST" })
  .inputValidator((data: { text: string }) => ({ text: String(data?.text ?? "").slice(0, 20000) }))
  .handler(async ({ data }): Promise<{ tier: string; lines: PadLine[] }> => {
    const { tradeAccount, tierPrice } = await import("@/lib/trade.server");
    const account = await tradeAccount();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const parsed = data.text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 200)
      .map((line) => {
        const parts = line.split(/[,;\t]|\s{2,}/).map((p) => p.trim()).filter(Boolean);
        let code = parts[0] ?? line;
        let qty = Number(parts[1]);
        if (!Number.isFinite(qty)) {
          const tail = line.match(/(.+?)[\sxX*]+(\d{1,4})$/);
          if (tail) {
            code = tail[1]!.trim();
            qty = Number(tail[2]);
          }
        }
        return { input: line, code: code.trim(), qty: Math.max(1, Math.min(9999, Number.isFinite(qty) ? Number(qty) : 1)) };
      });

    const codes = parsed.map((p) => p.code.toUpperCase());
    const { data: rows } = await supabaseAdmin
      .from("products")
      .select("id, sku, slug, name, price, stock, status, trade_only, min_order_qty, order_multiple")
      .in("sku", codes)
      .limit(400);

    const lines: PadLine[] = [];
    for (const p of parsed) {
      let row = (rows ?? []).find((r) => String(r.sku).toUpperCase() === p.code.toUpperCase());
      if (!row) {
        const { data: fuzzy } = await supabaseAdmin
          .from("products")
          .select("id, sku, slug, name, price, stock, status, trade_only, min_order_qty, order_multiple")
          .or(`sku.ilike.%${p.code.replace(/[%,]/g, "")}%,name.ilike.%${p.code.replace(/[%,]/g, "")}%`)
          .eq("status", "visible")
          .limit(1);
        row = fuzzy?.[0];
      }
      if (!row || row.status !== "visible" || (row.trade_only && account.tier === "retail")) {
        lines.push({ input: p.input, qty: p.qty, productId: null, name: null, slug: null, sku: null, unitPrice: null, stock: 0, problem: "Not found" });
        continue;
      }
      const multiple = Math.max(1, Number(row.order_multiple ?? 1));
      const minQty = Math.max(1, Number(row.min_order_qty ?? 1));
      let problem: string | null = null;
      if (account.tier !== "retail" && p.qty < minQty) problem = `Minimum ${minQty}`;
      else if (account.tier !== "retail" && p.qty % multiple !== 0) problem = `Sold in multiples of ${multiple}`;
      else if (Number(row.stock ?? 0) < p.qty) problem = `Only ${row.stock} in stock`;

      const unit = account.tier === "retail" ? row.price : await tierPrice(row.id, account.tier, p.qty);
      lines.push({
        input: p.input,
        qty: p.qty,
        productId: row.id,
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        unitPrice: unit === null || unit === undefined ? null : Number(unit),
        stock: Number(row.stock ?? 0),
        problem,
      });
    }
    return { tier: account.tier, lines };
  });

/** The customer's own price list as a spreadsheet (CSV opens in Excel). */
export const myPriceList = createServerFn({ method: "POST" }).handler(async (): Promise<{ tier: string; csv: string }> => {
  const { tradeAccount } = await import("@/lib/trade.server");
  const account = await tradeAccount();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let query = supabaseAdmin
    .from("products")
    .select("id, sku, name, brand, price, stock, min_order_qty, order_multiple, trade_only, categories(name)")
    .eq("status", "visible")
    .order("name")
    .limit(2000);
  if (account.tier === "retail") query = query.eq("trade_only", false);
  const { data: rows } = await query;

  const ids = (rows ?? []).map((r) => r.id);
  const tiers =
    account.tier === "retail"
      ? []
      : ((
          await supabaseAdmin
            .from("price_tiers")
            .select("product_id, price, min_qty")
            .eq("tier", account.tier)
            .in("product_id", ids)
        ).data ?? []);

  const bestFor = (id: string, qty: number) =>
    tiers
      .filter((t) => t.product_id === id && Number(t.min_qty) <= qty)
      .sort((a, b) => Number(b.min_qty) - Number(a.min_qty))[0]?.price ?? null;

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Part number", "Name", "Brand", "Category", "MRP", "Your price 1-9", "Your price 10-49", "Your price 50+", "Min qty", "Multiples of", "In stock"];
  const body = (rows ?? []).map((r) =>
    [
      r.sku,
      r.name,
      r.brand ?? "",
      (r as { categories?: { name?: string } | null }).categories?.name ?? "",
      r.price ?? "",
      bestFor(r.id, 1) ?? r.price ?? "",
      bestFor(r.id, 10) ?? r.price ?? "",
      bestFor(r.id, 50) ?? r.price ?? "",
      r.min_order_qty ?? 1,
      r.order_multiple ?? 1,
      r.stock ?? 0,
    ]
      .map(esc)
      .join(","),
  );
  return { tier: account.tier, csv: [header.map(esc).join(","), ...body].join("\n") };
});

/** Items from a previous order, ready to drop back into the cart. */
export const reorderItems = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data }): Promise<{ items: { productId: string; qty: number; name: string }[]; skipped: string[] }> => {
    const { tradeAccount } = await import("@/lib/trade.server");
    const account = await tradeAccount();
    if (!account.userId || !/^[0-9a-f-]{36}$/i.test(data.orderId)) return { items: [], skipped: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, profile_id, order_items(product_id, name_snapshot, qty)")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.profile_id !== account.userId) return { items: [], skipped: [] };

    const lines = (order.order_items ?? []) as { product_id: string | null; name_snapshot: string; qty: number }[];
    const ids = lines.map((l) => l.product_id).filter(Boolean) as string[];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, status, stock, trade_only")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const items: { productId: string; qty: number; name: string }[] = [];
    const skipped: string[] = [];
    for (const line of lines) {
      const p = (products ?? []).find((r) => r.id === line.product_id);
      if (!p || p.status !== "visible" || (p.trade_only && account.tier === "retail") || Number(p.stock) < 1) {
        skipped.push(line.name_snapshot);
        continue;
      }
      items.push({ productId: p.id, qty: Math.max(1, Math.min(Number(p.stock), Number(line.qty) || 1)), name: p.name });
    }
    return { items, skipped };
  });
