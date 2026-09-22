/**
 * WhatsApp sending through the Lovable connector gateway.
 * Every attempt is written to public.notifications so the owner can see what
 * went out and what failed.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/whatsapp";

export function whatsappConfigured(): boolean {
  return Boolean(process.env['LOVABLE_API_KEY'] && process.env['WHATSAPP_API_KEY']);
}

/** Normalise an Indian phone number to the digits-only form WhatsApp expects. */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length === 11 && d.startsWith("0")) return `91${d.slice(1)}`;
  if (d.length >= 11 && d.length <= 15) return d;
  return null;
}

export type SendResult = { ok: boolean; id?: string; error?: string };

export async function sendWhatsAppText(opts: {
  to: string | null | undefined;
  body: string;
  kind: string;
  orderId?: string | null;
}): Promise<SendResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const to = toWhatsAppNumber(opts.to);
  const base = {
    channel: "whatsapp",
    recipient: to ?? String(opts.to ?? ""),
    kind: opts.kind,
    order_id: opts.orderId ?? null,
    body: opts.body.slice(0, 4000),
  };

  const fail = async (error: string): Promise<SendResult> => {
    await supabaseAdmin.from("notifications").insert({ ...base, status: "failed", error } as never);
    return { ok: false, error };
  };

  if (!to) return fail("No valid phone number for this message.");
  if (!whatsappConfigured()) return fail("WhatsApp is not connected yet.");

  try {
    const response = await fetch(`${GATEWAY_URL}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env['LOVABLE_API_KEY']}`,
        "X-Connection-Api-Key": process.env['WHATSAPP_API_KEY']!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: opts.body.slice(0, 4000) },
      }),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`WhatsApp send failed [${response.status}]: ${text}`);
      return fail(`[${response.status}] ${text.slice(0, 500)}`);
    }
    let messageId: string | undefined;
    try {
      messageId = JSON.parse(text)?.messages?.[0]?.id;
    } catch {
      messageId = undefined;
    }
    await supabaseAdmin.from("notifications").insert({
      ...base,
      status: "accepted",
      provider_message_id: messageId ?? null,
    } as never);

    if (messageId) await reconcilePendingStatuses(messageId);
    return messageId ? { ok: true, id: messageId } : { ok: true };
  } catch (e) {
    return fail(e instanceof Error ? e.message : "WhatsApp request failed");
  }
}

const RANK: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

/** Apply delivery callbacks that arrived before the outbound row was saved. */
export async function reconcilePendingStatuses(messageId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pending } = await supabaseAdmin
    .from("whatsapp_pending_statuses")
    .select("id, status, error, status_at")
    .eq("message_id", messageId)
    .order("status_at", { ascending: true });
  for (const p of pending ?? []) {
    await applyMessageStatus(messageId, String(p.status), p.error ?? null, String(p.status_at));
    await supabaseAdmin.from("whatsapp_pending_statuses").delete().eq("id", p.id);
  }
}

/**
 * Record a delivery state for an outbound message. Never downgrades an
 * already-recorded state (an older "sent" cannot overwrite "delivered").
 * Returns false when no outbound row exists yet.
 */
export async function applyMessageStatus(
  messageId: string,
  status: string,
  error: string | null,
  statusAt: string,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("notifications")
    .select("id, status")
    .eq("provider_message_id", messageId)
    .maybeSingle();
  if (!row) return false;
  const current = RANK[String(row.status)] ?? 0;
  const next = RANK[status] ?? 0;
  if (next < current) return true;
  await supabaseAdmin
    .from("notifications")
    .update({ status, error, updated_at: statusAt } as never)
    .eq("id", row.id);
  return true;
}
