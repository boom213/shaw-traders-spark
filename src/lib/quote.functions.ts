import { createServerFn } from "@tanstack/react-start";

export type Quote = {
  enquiryId: string;
  productId: string;
  productName: string;
  productSlug: string | null;
  imageUrl: string | null;
  qty: number;
  unitPrice: number;
  expiresAt: string | null;
  spent: boolean;
  expired: boolean;
};

/** Open a price quote the shop sent by WhatsApp. No sign-in needed. */
export const loadQuote = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => ({ token: String(data?.token ?? "").trim().slice(0, 40) }))
  .handler(async ({ data }): Promise<Quote | null> => {
    if (!/^[0-9a-f-]{36}$/i.test(data.token)) return null;
    const { publicClient } = await import("@/lib/supabase-public.server");
    const { data: rows } = await publicClient().rpc("quote_by_token", { p_token: data.token });
    const row = (Array.isArray(rows) ? rows[0] : rows) as Record<string, unknown> | undefined;
    if (!row) return null;
    const expiresAt = row['expires_at'] ? String(row['expires_at']) : null;
    return {
      enquiryId: String(row['enquiry_id']),
      productId: String(row['product_id']),
      productName: String(row['product_name'] ?? ""),
      productSlug: row['product_slug'] ? String(row['product_slug']) : null,
      imageUrl: row['image_url'] ? String(row['image_url']) : null,
      qty: Number(row['qty'] ?? 1),
      unitPrice: Number(row['unit_price'] ?? 0),
      expiresAt,
      spent: Boolean(row['spent']),
      expired: expiresAt ? Date.parse(expiresAt) < Date.now() : false,
    };
  });
