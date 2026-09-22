/**
 * Two background nudges:
 *  - a WhatsApp reminder for carts left behind for a few hours
 *  - a WhatsApp message when a part someone waited for is back in stock
 */
import { BUSINESS, formatINR } from "@/lib/catalog";
import { sendWhatsAppText } from "@/lib/whatsapp.server";

type Row = Record<string, any>;

const HOURS = 4;
const COOLDOWN_DAYS = 7;

export async function sendAbandonedCartReminders(): Promise<{ sent: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - HOURS * 60 * 60 * 1000).toISOString();
  const cooldown = new Date(Date.now() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await supabaseAdmin
    .from("user_lists")
    .select("profile_id, cart, updated_at, reminded_at, profiles(full_name, phone)")
    .lt("updated_at", cutoff)
    .limit(100);

  let sent = 0;
  for (const row of (rows ?? []) as Row[]) {
    const cart = (row['cart'] ?? []) as { productId: string; qty: number }[];
    if (!Array.isArray(cart) || cart.length === 0) continue;
    if (row['reminded_at'] && String(row['reminded_at']) > cooldown) continue;

    const phone = row['profiles']?.['phone'];
    if (!phone) continue;

    // Skip anyone who already ordered after the cart was last touched.
    const { data: recent } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("profile_id", row['profile_id'])
      .gte("placed_at", String(row['updated_at']))
      .limit(1);
    if ((recent ?? []).length > 0) continue;

    const { data: products } = await supabaseAdmin
      .from("products")
      .select("name, price")
      .in("id", cart.map((c) => c.productId).slice(0, 20));
    const names = ((products ?? []) as Row[]).map((p) => String(p['name'])).slice(0, 3);
    if (names.length === 0) continue;
    const value = ((products ?? []) as Row[]).reduce((n, p) => n + Number(p['price'] ?? 0), 0);

    const name = row['profiles']?.['full_name'] ? `Hi ${row['profiles']['full_name']}, ` : "Hi, ";
    const body =
      `${name}you left these in your cart at ${BUSINESS.name}:\n` +
      names.map((n) => `• ${n}`).join("\n") +
      (cart.length > names.length ? `\n• and ${cart.length - names.length} more` : "") +
      (value > 0 ? `\n\nCart value: ${formatINR(value)}` : "") +
      `\n\nFinish your order here: ${BUSINESS.site}/cart\nAny questions? Just reply to this message.`;

    const res = await sendWhatsAppText({ to: phone, body, kind: "cart.reminder" });
    await supabaseAdmin
      .from("user_lists")
      .update({ reminded_at: new Date().toISOString() } as never)
      .eq("profile_id", row['profile_id']);
    if (res.ok) sent += 1;
  }
  return { sent };
}

/** Tell everyone waiting that a part is available again. */
export async function notifyBackInStock(productId: string): Promise<{ sent: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: waiting } = await supabaseAdmin
    .from("stock_alerts")
    .select("id, contact, channel")
    .eq("product_id", productId)
    .is("notified_at", null)
    .limit(200);
  if (!waiting || waiting.length === 0) return { sent: 0 };

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("name, slug, price")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { sent: 0 };

  const price = (product as Row)['price'];
  const body =
    `Good news — ${(product as Row)['name']} is back in stock at ${BUSINESS.name}.` +
    (price ? `\nPrice: ${formatINR(Number(price))}` : "") +
    `\n\nOrder here: ${BUSINESS.site}/product/${(product as Row)['slug']}`;

  let sent = 0;
  for (const row of waiting as Row[]) {
    const res = await sendWhatsAppText({
      to: String(row['contact']),
      body,
      kind: "stock.back",
    });
    await supabaseAdmin
      .from("stock_alerts")
      .update({ notified_at: new Date().toISOString() } as never)
      .eq("id", row['id']);
    if (res.ok) sent += 1;
  }
  return { sent };
}
