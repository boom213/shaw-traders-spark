/**
 * Self-service on WhatsApp: a customer messaging the shop number gets their
 * order status, tracking and invoice link back without anyone at the counter
 * touching the phone. A photo of a broken part becomes an availability request.
 */
type Row = Record<string, any>;

const ORDER_RE = /STE-\d{6}-\d{4}/i;

const origin = () => String(process.env['PUBLIC_SITE_URL'] ?? "https://shawtradersev.com").replace(/\/+$/, "");

const STATUS_WORDS: Record<string, string> = {
  order_confirmed: "confirmed",
  processing: "being packed",
  packed: "packed and ready",
  shipped: "on the way",
  out_for_delivery: "out for delivery today",
  delivered: "delivered",
  cancelled: "cancelled",
  returned: "returned",
};

export async function handleInboundMessages(payload: Row): Promise<void> {
  const messages = (payload?.['entry']?.[0]?.['changes']?.[0]?.['value']?.['messages'] ?? []) as Row[];
  for (const message of messages) {
    const from = String(message['from'] ?? "").replace(/\D/g, "");
    if (!from) continue;
    const type = String(message['type'] ?? "text");
    if (type === "image" || type === "document") {
      await savePhotoEnquiry(from, message);
    } else {
      await answerOrderQuestion(from, String(message['text']?.['body'] ?? ""));
    }
  }
}

/** Look the order up by number, or fall back to this phone's latest order. */
async function answerOrderQuestion(from: string, text: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const last10 = from.slice(-10);
  const match = text.match(ORDER_RE);

  const select =
    "id, human_id, public_token, status, total, payment_status, courier_name, tracking_number, tracking_url, placed_at";
  const query = match
    ? supabaseAdmin.from("orders").select(select).ilike("human_id", match[0]).limit(1)
    : supabaseAdmin.from("orders").select(select).eq("contact_phone", last10).order("placed_at", { ascending: false }).limit(1);

  const { data: rows } = await query;
  const order = (rows ?? [])[0] as Row | undefined;

  if (!order) {
    await sendWhatsAppText({
      to: from,
      kind: "selfservice.not_found",
      body: match
        ? `We could not find order ${match[0]}. Please check the number, or reply and someone from Shaw Traders EV will help.`
        : "Send us your order number (like STE-260101-1234) and we will send you the status straight away. — Shaw Traders EV",
    });
    return;
  }

  const link = `${origin()}/order/${order['id']}?t=${order['public_token']}`;
  const tracking = order['tracking_number']
    ? `\nTracking: ${order['courier_name'] ?? ""} ${order['tracking_number']}${order['tracking_url'] ? `\n${order['tracking_url']}` : ""}`
    : "";
  const body = `Order ${order['human_id']} is ${STATUS_WORDS[String(order['status'])] ?? String(order['status'])}.\nAmount ₹${Number(
    order['total'] ?? 0,
  )} · ${String(order['payment_status']).replace("_", " ")}${tracking}\nFull details and invoice: ${link}\n— Shaw Traders EV`;

  await sendWhatsAppText({ to: from, kind: "selfservice.status", body, orderId: String(order['id']) });
}

/** A photo of the broken part lands in the availability queue. */
async function savePhotoEnquiry(from: string, message: Row): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const last10 = from.slice(-10);
  const media = message['image'] ?? message['document'] ?? {};
  const caption = String(media['caption'] ?? "").slice(0, 400);
  const mediaId = String(media['id'] ?? media['link'] ?? "");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name")
    .eq("phone", last10)
    .maybeSingle();

  await supabaseAdmin.from("product_enquiries").insert({
    product_id: null,
    product_name: null,
    name: profile?.full_name ?? "WhatsApp customer",
    phone: last10,
    qty: 1,
    note: caption || "Photo of the part sent on WhatsApp",
    photo_url: mediaId || null,
    source: "whatsapp",
    status: "new",
  } as never);

  await sendWhatsAppText({
    to: from,
    kind: "selfservice.photo",
    body: "Thank you — we have your photo. We will check which part it is and message you the price and availability shortly. — Shaw Traders EV",
  });
}
