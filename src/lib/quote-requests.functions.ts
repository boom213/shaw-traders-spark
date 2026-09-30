import { createServerFn } from "@tanstack/react-start";

export type QuoteRequestStatus = "submitted" | "priced" | "accepted" | "rejected" | "expired";

export type QuoteRequestItem = {
  id: string;
  productId: string | null;
  name: string;
  sku: string | null;
  qty: number;
  unitPrice: number | null;
  lineNote: string | null;
};

export type CustomerQuoteRequest = {
  id: string;
  humanId: string;
  status: QuoteRequestStatus;
  customerNote: string | null;
  decisionNote: string | null;
  pricedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  gstRate: number | null;
  gstIncluded: boolean;
  items: QuoteRequestItem[];
};

export type StaffQuoteRequest = CustomerQuoteRequest & {
  customerName: string;
  customerPhone: string;
  staffNote: string | null;
  pricedBy: string | null;
};

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const uuid = (value: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ""));

function mapItem(row: Record<string, unknown>): QuoteRequestItem {
  return {
    id: String(row['id']),
    productId: row['product_id'] ? String(row['product_id']) : null,
    name: String(row['name_snapshot'] ?? "Part"),
    sku: row['sku_snapshot'] ? String(row['sku_snapshot']) : null,
    qty: Number(row['qty'] ?? 1),
    unitPrice: row['unit_price'] === null || row['unit_price'] === undefined ? null : Number(row['unit_price']),
    lineNote: row['line_note'] ? String(row['line_note']) : null,
  };
}

function effectiveStatus(status: string, expiresAt: string | null): QuoteRequestStatus {
  if (status === "priced" && expiresAt && Date.parse(expiresAt) <= Date.now()) return "expired";
  return (["submitted", "priced", "accepted", "rejected", "expired"].includes(status) ? status : "submitted") as QuoteRequestStatus;
}

/** Create one atomic wholesale quote request from validated product IDs and quantities. */
export const submitQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { lines: Array<{ productId: string; qty: number }>; customerNote?: string }) => ({
    lines: Array.isArray(input?.lines) ? input.lines.slice(0, 101).map((line) => ({
      productId: clean(line?.productId, 40),
      qty: Math.min(9999, Math.max(1, Math.round(Number(line?.qty) || 1))),
    })) : [],
    customerNote: clean(input?.customerNote, 500),
  }))
  .handler(async ({ data }): Promise<{ ok: true; quoteId: string; humanId: string } | { ok: false; error: string }> => {
    const { tradeAccount } = await import("@/lib/trade.server");
    const account = await tradeAccount();
    if (!account.userId || !account.approved) return { ok: false, error: "An approved wholesale account is required." };
    if (data.lines.length === 0) return { ok: false, error: "Add at least one valid part." };
    if (data.lines.length > 100) return { ok: false, error: "A quote can contain at most 100 lines." };
    if (data.lines.some((line) => !uuid(line.productId))) return { ok: false, error: "A selected part is not valid." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("create_quote_request", {
      p_profile_id: account.userId,
      p_lines: data.lines.map((line) => ({ product_id: line.productId, qty: line.qty })),
      p_customer_note: data.customerNote || undefined,
    });
    const row = Array.isArray(rows) ? rows[0] : rows;
    if (error || !row) return { ok: false, error: error?.message ?? "Could not submit this quote request." };
    return { ok: true, quoteId: String(row.quote_id), humanId: String(row.human_id) };
  });

/** Read the signed-in wholesale customer's own quote history. */
export const myQuoteRequests = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerQuoteRequest[]> => {
  const { tradeAccount } = await import("@/lib/trade.server");
  const account = await tradeAccount();
  if (!account.userId || !account.approved) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: quotes } = await supabaseAdmin
    .from("quote_requests")
    .select("id, human_id, status, customer_note, decision_note, priced_at, expires_at, created_at, gst_rate, gst_included")
    .eq("profile_id", account.userId)
    .order("created_at", { ascending: false });
  const quoteIds = (quotes ?? []).map((quote) => quote.id);
  const { data: items } = quoteIds.length
    ? await supabaseAdmin.from("quote_request_items").select("id, quote_request_id, product_id, name_snapshot, sku_snapshot, qty, unit_price, line_note").in("quote_request_id", quoteIds).order("created_at")
    : { data: [] };
  const byQuote = new Map<string, QuoteRequestItem[]>();
  for (const row of items ?? []) {
    const id = String(row.quote_request_id);
    byQuote.set(id, [...(byQuote.get(id) ?? []), mapItem(row as unknown as Record<string, unknown>)]);
  }
  return (quotes ?? []).map((quote) => ({
    id: quote.id,
    humanId: quote.human_id,
    status: effectiveStatus(quote.status, quote.expires_at),
    customerNote: quote.customer_note,
    decisionNote: quote.decision_note,
    pricedAt: quote.priced_at,
    expiresAt: quote.expires_at,
    createdAt: quote.created_at,
    gstRate: quote.gst_rate === null ? null : Number(quote.gst_rate),
    gstIncluded: quote.gst_included,
    items: byQuote.get(quote.id) ?? [],
  }));
});

/** Accept or reject an active priced quote. Prices are not writable on this path. */
export const respondToQuote = createServerFn({ method: "POST" })
  .inputValidator((input: { quoteId: string; decision: "accepted" | "rejected"; note?: string }) => ({
    quoteId: clean(input?.quoteId, 40),
    decision: input?.decision,
    note: clean(input?.note, 500),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!uuid(data.quoteId) || !["accepted", "rejected"].includes(data.decision)) return { ok: false, error: "Choose a valid response." };
    const { tradeAccount } = await import("@/lib/trade.server");
    const account = await tradeAccount();
    if (!account.userId || !account.approved) return { ok: false, error: "An approved wholesale account is required." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("respond_to_quote_request", {
      p_quote_id: data.quoteId,
      p_profile_id: account.userId,
      p_decision: data.decision,
      p_note: data.note || undefined,
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  });

/** Manager+ quote queue with customer details and eight-row paging. */
export const listQuoteRequests = createServerFn({ method: "POST" })
  .inputValidator((input: { status?: string; search?: string; page?: number } | undefined) => ({
    status: ["submitted", "priced", "accepted", "rejected", "expired", "all"].includes(String(input?.status)) ? String(input?.status) : "submitted",
    search: clean(input?.search, 100),
    page: Math.max(0, Math.floor(Number(input?.page ?? 0))),
  }))
  .handler(async ({ data }): Promise<{ items: StaffQuoteRequest[]; total: number }> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff({ capability: "quotes" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let profileIds: string[] | null = null;
    if (data.search) {
      const escaped = data.search.replace(/[%_,]/g, "");
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id").or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`).limit(100);
      profileIds = (profiles ?? []).map((profile) => profile.id);
    }
    let query = supabaseAdmin
      .from("quote_requests")
      .select("id, human_id, profile_id, status, customer_note, staff_note, decision_note, priced_by, priced_at, expires_at, created_at, gst_rate, gst_included", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(data.page * 8, data.page * 8 + 7);
    if (data.status === "expired") query = query.eq("status", "priced").lte("expires_at", new Date().toISOString());
    else if (data.status !== "all") query = query.eq("status", data.status);
    if (data.search) {
      const escaped = data.search.replace(/[%_,]/g, "");
      query = profileIds?.length ? query.or(`human_id.ilike.%${escaped}%,profile_id.in.(${profileIds.join(",")})`) : query.ilike("human_id", `%${escaped}%`);
    }
    const { data: quotes, count } = await query;
    const quoteIds = (quotes ?? []).map((quote) => quote.id);
    const customerIds = [...new Set((quotes ?? []).map((quote) => quote.profile_id))];
    const [{ data: items }, { data: profiles }] = await Promise.all([
      quoteIds.length ? supabaseAdmin.from("quote_request_items").select("id, quote_request_id, product_id, name_snapshot, sku_snapshot, qty, unit_price, line_note").in("quote_request_id", quoteIds).order("created_at") : Promise.resolve({ data: [] }),
      customerIds.length ? supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", customerIds) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const itemMap = new Map<string, QuoteRequestItem[]>();
    for (const row of items ?? []) {
      const id = String(row.quote_request_id);
      itemMap.set(id, [...(itemMap.get(id) ?? []), mapItem(row as unknown as Record<string, unknown>)]);
    }
    return {
      total: count ?? 0,
      items: (quotes ?? []).map((quote) => {
        const profile = profileMap.get(quote.profile_id);
        return {
          id: quote.id,
          humanId: quote.human_id,
          status: effectiveStatus(quote.status, quote.expires_at),
          customerNote: quote.customer_note,
          decisionNote: quote.decision_note,
          staffNote: quote.staff_note,
          pricedBy: quote.priced_by,
          pricedAt: quote.priced_at,
          expiresAt: quote.expires_at,
          createdAt: quote.created_at,
          gstRate: quote.gst_rate === null ? null : Number(quote.gst_rate),
          gstIncluded: quote.gst_included,
          customerName: profile?.full_name ?? "Wholesale customer",
          customerPhone: profile?.phone ?? "",
          items: itemMap.get(quote.id) ?? [],
        };
      }),
    };
  });

/** Atomically price every line and publish the quote to the customer. */
export const priceQuoteRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { quoteId: string; lines: Array<{ itemId: string; unitPrice: number; lineNote?: string }>; expiresAt: string; staffNote?: string; gstRate?: number | null; gstIncluded?: boolean }) => ({
    quoteId: clean(input?.quoteId, 40),
    lines: Array.isArray(input?.lines) ? input.lines.slice(0, 101).map((line) => ({ itemId: clean(line?.itemId, 40), unitPrice: Number(line?.unitPrice), lineNote: clean(line?.lineNote, 300) })) : [],
    expiresAt: clean(input?.expiresAt, 40),
    staffNote: clean(input?.staffNote, 1000),
    gstRate: input?.gstRate === null || input?.gstRate === undefined || input.gstRate === 0 ? null : Number(input.gstRate),
    gstIncluded: Boolean(input?.gstIncluded),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff({ capability: "quotes" });
    const expiresAt = Date.parse(data.expiresAt);
    if (!uuid(data.quoteId) || !data.lines.length || data.lines.length > 100) return { ok: false, error: "Price every quote line." };
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return { ok: false, error: "Choose a future expiry date." };
    if (data.gstRate !== null && (!Number.isFinite(data.gstRate) || data.gstRate <= 0 || data.gstRate > 100)) return { ok: false, error: "Enter a valid GST rate or leave it blank." };
    if (data.lines.some((line) => !uuid(line.itemId) || !Number.isFinite(line.unitPrice) || line.unitPrice <= 0 || line.unitPrice > 10_000_000)) return { ok: false, error: "Enter a valid price for every line." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: gstError } = await supabaseAdmin.from("quote_requests").update({ gst_rate: data.gstRate, gst_included: data.gstRate === null ? false : data.gstIncluded }).eq("id", data.quoteId);
    if (gstError) return { ok: false, error: gstError.message };
    const { error } = await supabaseAdmin.rpc("price_quote_request", {
      p_quote_id: data.quoteId,
      p_lines: data.lines.map((line) => ({ item_id: line.itemId, unit_price: line.unitPrice, line_note: line.lineNote })),
      p_expires_at: new Date(expiresAt).toISOString(),
      p_staff_note: data.staffNote,
      p_priced_by: actor.name,
    });
    if (error) return { ok: false, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "quote.priced", "quote_requests", data.quoteId, { expiresAt: new Date(expiresAt).toISOString(), lineCount: data.lines.length, gstRate: data.gstRate, gstIncluded: data.gstRate === null ? false : data.gstIncluded });
    return { ok: true };
  });

/** Download only the signed-in wholesale customer's own current priced quote. */
export const downloadMyProforma = createServerFn({ method: "POST" })
  .inputValidator((input: { quoteId: string }) => ({ quoteId: clean(input?.quoteId, 40) }))
  .handler(async ({ data }) => {
    if (!uuid(data.quoteId)) return { error: "Quote request not found." };
    const { tradeAccount } = await import("@/lib/trade.server");
    const account = await tradeAccount();
    if (!account.userId || !account.approved) return { error: "An approved wholesale account is required." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: quote } = await supabaseAdmin.from("quote_requests").select("id").eq("id", data.quoteId).eq("profile_id", account.userId).maybeSingle();
    if (!quote) return { error: "Quote request not found." };
    const { proformaPdfBase64 } = await import("@/lib/invoice.server");
    return proformaPdfBase64(quote.id);
  });

/** Manager+ download of a current priced wholesale quote. */
export const downloadStaffProforma = createServerFn({ method: "POST" })
  .inputValidator((input: { quoteId: string }) => ({ quoteId: clean(input?.quoteId, 40) }))
  .handler(async ({ data }) => {
    if (!uuid(data.quoteId)) return { error: "Quote request not found." };
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff({ capability: "quotes" });
    const { proformaPdfBase64 } = await import("@/lib/invoice.server");
    return proformaPdfBase64(data.quoteId);
  });