import { createServerFn } from "@tanstack/react-start";

export type Enquiry = {
  id: string;
  productId: string | null;
  productName: string;
  name: string;
  phone: string;
  qty: number;
  note: string | null;
  status: string;
  createdAt: string;
};

const clean = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** A customer asking whether a part is available, while ordering is off. */
export const createEnquiry = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: string; name: string; phone: string; qty: number; note?: string }) => ({
    productId: clean(data?.productId, 40),
    name: clean(data?.name, 120),
    phone: String(data?.phone ?? "").replace(/\D/g, "").slice(-10),
    qty: Math.max(1, Math.min(999, Number(data?.qty) || 1)),
    note: clean(data?.note, 400),
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
      .select("id, product_id, product_name, name, phone, qty, note, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);
    const { data: rows } = await query;
    return (rows ?? []).map((r) => ({
      id: String(r.id),
      productId: r.product_id,
      productName: String(r.product_name),
      name: String(r.name),
      phone: String(r.phone),
      qty: Number(r.qty ?? 1),
      note: r.note,
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
