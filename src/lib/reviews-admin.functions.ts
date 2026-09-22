import { createServerFn } from "@tanstack/react-start";

type Row = Record<string, any>;

export type ManageReview = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  rating: number;
  title: string | null;
  body: string | null;
  photos: string[];
  status: string;
  verified: boolean;
  reply: string | null;
  createdAt: string;
  customer: string;
};

async function adminAs() {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { sb: supabaseAdmin, actor, logAudit };
}

const map = (r: Row): ManageReview => ({
  id: String(r['id']),
  productId: String(r['product_id']),
  productName: String(r['products']?.['name'] ?? "Product"),
  productSlug: String(r['products']?.['slug'] ?? ""),
  rating: Number(r['rating']),
  title: r['title'] ?? null,
  body: r['body'] ?? null,
  photos: (r['photos'] ?? []) as string[],
  status: String(r['status']),
  verified: Boolean(r['is_verified_purchase']),
  reply: r['staff_reply'] ?? null,
  createdAt: String(r['created_at']),
  customer: String(r['profiles']?.['full_name'] ?? r['profiles']?.['phone'] ?? "Customer"),
});

/** Reviews waiting for the owner, or everything already decided. */
export const manageReviews = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string } | undefined) => ({
    status: String(data?.status ?? "pending"),
  }))
  .handler(async ({ data }): Promise<ManageReview[]> => {
    const { sb } = await adminAs();
    let q = sb
      .from("reviews")
      .select(
        "id, product_id, rating, title, body, photos, status, is_verified_purchase, staff_reply, created_at, products(name, slug), profiles(full_name, phone)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status as "pending" | "approved" | "rejected");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(map);
  });

/** Publish or hide a customer review. */
export const moderateReview = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: "approved" | "rejected" | "pending" }) => ({
    id: String(data?.id ?? ""),
    status: (["approved", "rejected", "pending"].includes(String(data?.status))
      ? data.status
      : "pending") as "approved" | "rejected" | "pending",
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const { error } = await sb.from("reviews").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(sb as never, actor, "review.moderated", "reviews", data.id, { to: data.status });
    return { ok: true as const };
  });

/** Reply publicly to a review. */
export const replyToReview = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; reply: string }) => ({
    id: String(data?.id ?? ""),
    reply: String(data?.reply ?? "").trim().slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    const { sb, actor, logAudit } = await adminAs();
    const { error } = await sb
      .from("reviews")
      .update({
        staff_reply: data.reply || null,
        staff_replied_at: data.reply ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit(sb as never, actor, "review.replied", "reviews", data.id, { reply: data.reply });
    return { ok: true as const };
  });
