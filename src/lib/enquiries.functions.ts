import { createServerFn } from "@tanstack/react-start";

export type Enquiry = {
  id: string;
  productId: string | null;
  productName: string;
  name: string;
  phone: string;
  qty: number;
  note: string | null;
  vehicle: string | null;
  source: string;
  photoUrl: string | null;
  reply: string | null;
  repliedAt: string | null;
  expectedDate: string | null;
  quotedPrice: number | null;
  quoteLink: string | null;
  status: string;
  createdAt: string;
};

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const siteOrigin = () =>
  String(process.env['PUBLIC_SITE_URL'] ?? "https://shawtradersev.com").replace(/\/+$/, "");

/** A customer asking whether a part is available, or what it costs. */
export const createEnquiry = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: string; name: string; phone: string; qty: number; note?: string; vehicle?: string }) => ({
    productId: clean(data?.productId, 40),
    name: clean(data?.name, 120),
    phone: String(data?.phone ?? "").replace(/\D/g, "").slice(-10),
    qty: Math.max(1, Math.min(999, Number(data?.qty) || 1)),
    note: clean(data?.note, 400),
    vehicle: clean(data?.vehicle, 120),
  }))
  .handler(async ({ data }) => {
    if (data.name.length < 2) return { ok: false as const, message: "Please tell us your name." };
    if (data.phone.length !== 10) return { ok: false as const, message: "Enter a 10-digit mobile number." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, name")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product) return { ok: false as const, message: "That part is no longer listed." };

    const { error } = await supabaseAdmin.from("product_enquiries").insert({
      product_id: product.id,
      product_name: product.name,
      name: data.name,
      phone: data.phone,
      qty: data.qty,
      note: data.note || null,
      vehicle: data.vehicle || null,
      source: "web",
    } as never);
    if (error) return { ok: false as const, message: "Could not send your request. Please try again." };

    return { ok: true as const, message: "Thank you — we will call you back about availability." };
  });

/** Availability requests waiting for the shop. */
export const listEnquiries = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string } | undefined) => ({ status: String(data?.status ?? "new") }))
  .handler(async ({ data }): Promise<Enquiry[]> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("product_enquiries")
      .select(
        "id, product_id, product_name, name, phone, qty, note, status, created_at, vehicle, source, photo_url, reply, replied_at, expected_date, quoted_price, quote_token",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows } = await query;
    return (rows ?? []).map((r) => ({
      id: String(r.id),
      productId: r.product_id,
      productName: String(r.product_name ?? "Photo from WhatsApp"),
      name: String(r.name),
      phone: String(r.phone),
      qty: Number(r.qty ?? 1),
      note: r.note,
      vehicle: r.vehicle ?? null,
      source: String(r.source ?? "web"),
      photoUrl: r.photo_url ?? null,
      reply: r.reply ?? null,
      repliedAt: r.replied_at ?? null,
      expectedDate: r.expected_date ?? null,
      quotedPrice: r.quoted_price === null || r.quoted_price === undefined ? null : Number(r.quoted_price),
      quoteLink: r.quote_token ? `${siteOrigin()}/quote/${r.quote_token}` : null,
      status: String(r.status),
      createdAt: String(r.created_at),
    }));
  });

/** Mark an availability request as handled or closed. */
export const setEnquiryStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string }) => ({
    id: clean(data?.id, 40),
    status: ["new", "contacted", "closed"].includes(String(data?.status)) ? String(data?.status) : "contacted",
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("product_enquiries")
      .update({ status: data.status, handled_by: actor.name } as never)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await logAudit(supabaseAdmin as never, actor, "enquiry.updated", "product_enquiries", data.id, { status: data.status });
    return { ok: true as const };
  });

export type EnquiryReply =
  | { id: string; kind: "quote"; price: number; qty?: number }
  | { id: string; kind: "out_of_stock"; expectedDate?: string }
  | { id: string; kind: "alternative"; productId: string };

/**
 * One tap from the manager panel: quote a price (which creates a pay link),
 * say it is out of stock with a date, or suggest another part. The customer is
 * told on WhatsApp straight away.
 */
export const replyToEnquiry = createServerFn({ method: "POST" })
  .inputValidator((data: EnquiryReply) => ({
    id: clean((data as { id?: string })?.id, 40),
    kind: ["quote", "out_of_stock", "alternative"].includes(String((data as { kind?: string })?.kind))
      ? String((data as { kind: string }).kind)
      : "quote",
    price: Math.max(0, Math.min(10_000_000, Number((data as { price?: number })?.price) || 0)),
    qty: Math.max(1, Math.min(999, Number((data as { qty?: number })?.qty) || 1)),
    expectedDate: clean((data as { expectedDate?: string })?.expectedDate, 20),
    productId: clean((data as { productId?: string })?.productId, 40),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; quoteLink?: string }> => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWhatsAppText } = await import("@/lib/whatsapp.server");

    const { data: enquiry } = await supabaseAdmin
      .from("product_enquiries")
      .select("id, product_id, product_name, name, phone, qty")
      .eq("id", data.id)
      .maybeSingle();
    if (!enquiry) return { ok: false, message: "That request is no longer there." };

    const partName = String(enquiry.product_name ?? "the part you asked about");
    let patch: Record<string, unknown> = { handled_by: actor.name, replied_at: new Date().toISOString(), status: "contacted" };
    let body = "";
    let quoteLink: string | undefined;

    if (data.kind === "quote") {
      if (data.price <= 0) return { ok: false, message: "Enter the price you want to quote." };
      if (!enquiry.product_id) return { ok: false, message: "Match this request to a part first." };
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      patch = {
        ...patch,
        quoted_price: data.price,
        quote_token: token,
        quote_expires_at: expires,
        qty: data.qty,
        reply: `Quoted ₹${data.price} each`,
      };
      quoteLink = `${siteOrigin()}/quote/${token}`;
      body = `Hello ${enquiry.name}, ${partName} is available at ₹${data.price} each for ${data.qty} piece(s). You can pay and order here: ${quoteLink} (valid 7 days). — Shaw Traders EV`;
    } else if (data.kind === "out_of_stock") {
      const when = data.expectedDate ? new Date(data.expectedDate).toLocaleDateString("en-IN") : null;
      patch = {
        ...patch,
        expected_date: data.expectedDate || null,
        reply: when ? `Out of stock, expected ${when}` : "Out of stock",
      };
      body = when
        ? `Hello ${enquiry.name}, ${partName} is out of stock right now. We expect it by ${when} and will message you then. — Shaw Traders EV`
        : `Hello ${enquiry.name}, ${partName} is out of stock right now. We will message you as soon as it arrives. — Shaw Traders EV`;
    } else {
      const { data: alt } = await supabaseAdmin
        .from("products")
        .select("id, name, slug, price")
        .eq("id", data.productId)
        .maybeSingle();
      if (!alt) return { ok: false, message: "Pick a part to suggest." };
      patch = { ...patch, alternative_product_id: alt.id, reply: `Suggested ${alt.name}` };
      const price = alt.price ? ` at ₹${alt.price}` : "";
      body = `Hello ${enquiry.name}, we do not have ${partName}, but ${alt.name}${price} will fit. See it here: ${siteOrigin()}/product/${alt.slug} — Shaw Traders EV`;
    }

    const { error } = await supabaseAdmin.from("product_enquiries").update(patch as never).eq("id", data.id);
    if (error) return { ok: false, message: "Could not save this reply." };

    const sent = await sendWhatsAppText({ to: String(enquiry.phone), body, kind: `enquiry.${data.kind}` });
    await logAudit(supabaseAdmin as never, actor, "enquiry.replied", "product_enquiries", data.id, { kind: data.kind });

    return {
      ok: true,
      message: sent.ok ? "Reply sent on WhatsApp." : "Saved. WhatsApp is not connected yet, so please call the customer.",
      ...(quoteLink ? { quoteLink } : {}),
    };
  });

/** Attach a WhatsApp photo enquiry to a real product once staff recognise it. */
export const matchEnquiryProduct = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; productId: string }) => ({
    id: clean(data?.id, 40),
    productId: clean(data?.productId, 40),
  }))
  .handler(async ({ data }) => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const actor = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, name")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product) return { ok: false as const, error: "Part not found." };
    const { error } = await supabaseAdmin
      .from("product_enquiries")
      .update({ product_id: product.id, product_name: product.name, handled_by: actor.name } as never)
      .eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not save." };
    await logAudit(supabaseAdmin as never, actor, "enquiry.matched", "product_enquiries", data.id, { productId: product.id });
    return { ok: true as const };
  });

/** Rack location and status — shop-floor details, only for signed-in staff. */
export const staffProductMeta = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: string }) => ({ productId: clean(data?.productId, 40) }))
  .handler(async ({ data }): Promise<{ staff: boolean; rackLocation: string | null; status: string | null }> => {
    const { staffContext } = await import("@/lib/staff.server");
    const ctx = await staffContext();
    if (!ctx) return { staff: false, rackLocation: null, status: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("products")
      .select("rack_location, status")
      .eq("id", data.productId)
      .maybeSingle();
    return { staff: true, rackLocation: row?.rack_location ?? null, status: row?.status ?? null };
  });
