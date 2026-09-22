import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicClient } from "@/lib/supabase-public.server";

/** Checks a discount code against the cart total before the order is placed. */
export const previewCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; subtotal: number }) => ({
    code: String(data?.code ?? "").trim().slice(0, 40),
    subtotal: Math.max(0, Number(data?.subtotal ?? 0)),
  }))
  .handler(async ({ data }): Promise<{ valid: boolean; discount: number; message: string }> => {
    if (!data.code) return { valid: false, discount: 0, message: "Enter a code." };
    const sb = publicClient();
    const { data: rows, error } = await sb.rpc("preview_coupon", {
      p_code: data.code,
      p_subtotal: data.subtotal,
    });
    if (error) return { valid: false, discount: 0, message: "Could not check this code right now." };
    const row = (rows as unknown as { valid: boolean; discount: number; message: string }[] | null)?.[0];
    if (!row) return { valid: false, discount: 0, message: "This code is not valid right now." };
    return { valid: Boolean(row.valid), discount: Number(row.discount ?? 0), message: String(row.message ?? "") };
  });

/** Posts a review. Only customers who actually bought the part may review it. */
export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string; rating: number; title?: string; body?: string; photos?: string[] }) => ({
    productId: String(data?.productId ?? ""),
    rating: Math.min(5, Math.max(1, Math.round(Number(data?.rating ?? 5)))),
    title: String(data?.title ?? "").slice(0, 120),
    body: String(data?.body ?? "").slice(0, 2000),
    photos: (Array.isArray(data?.photos) ? data.photos : []).map(String).slice(0, 4),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message: string }> => {
    const { supabase, userId } = context;
    if (!data.productId) return { ok: false, message: "Product missing." };

    const { data: bought } = await supabase
      .from("order_items")
      .select("id, orders!inner(profile_id, status)")
      .eq("product_id", data.productId)
      .eq("orders.profile_id", userId)
      .limit(1);
    if (!bought || bought.length === 0) {
      return { ok: false, message: "Only customers who bought this part can review it." };
    }

    const { data: already } = await supabase
      .from("reviews")
      .select("id")
      .eq("product_id", data.productId)
      .eq("profile_id", userId)
      .limit(1);
    if (already && already.length > 0) return { ok: false, message: "You have already reviewed this part." };

    const { error } = await supabase.from("reviews").insert({
      product_id: data.productId,
      profile_id: userId,
      rating: data.rating,
      title: data.title || null,
      body: data.body || null,
      photos: data.photos,
      is_verified_purchase: true,
    });
    if (error) return { ok: false, message: "Could not save your review. Please try again." };
    return { ok: true, message: "Thank you — your review appears once it is approved." };
  });

/** Tells a shopper when an out-of-stock part is back. */
export const notifyWhenInStock = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: string; contact: string; channel?: string }) => ({
    productId: String(data?.productId ?? ""),
    contact: String(data?.contact ?? "").trim().slice(0, 120),
    channel: data?.channel === "email" ? "email" : "whatsapp",
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const digits = data.contact.replace(/\D/g, "");
    if (data.channel === "whatsapp" && digits.length < 10) {
      return { ok: false, message: "Enter a valid mobile number." };
    }
    if (data.channel === "email" && !data.contact.includes("@")) {
      return { ok: false, message: "Enter a valid email address." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("stock_alerts")
      .upsert(
        { product_id: data.productId, channel: data.channel, contact: data.contact },
        { onConflict: "product_id,contact", ignoreDuplicates: true },
      );
    if (error) return { ok: false, message: "Could not save the alert. Please try again." };
    return { ok: true, message: "We will message you as soon as it is back." };
  });
