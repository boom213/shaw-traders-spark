/** WhatsApp messages for the scooter side: bookings, leads and service. */
import { BUSINESS, formatINR } from "@/lib/catalog";
import { bookingStatusLabel } from "@/lib/vehicles";

async function owner(): Promise<{ phone: string; enabled: boolean }> {
  const { notifySettings } = await import("@/lib/notify.server");
  const s = await notifySettings();
  return { phone: s.ownerPhone, enabled: s.enabled };
}

export async function notifyOwnerLead(kind: string, lines: string[]): Promise<void> {
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const o = await owner();
  if (!o.enabled) return;
  await sendWhatsAppText({ to: o.phone, kind: `lead.${kind}`, body: [`New ${kind}`, ...lines].join("\n") });
}

export async function notifyBookingPlaced(bookingId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const { data: b } = await supabaseAdmin
    .from("vehicle_bookings")
    .select("human_id, customer_name, phone, alternate_phone, colour, token_amount, balance_due, on_road_total, public_token, products(name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return;
  const model = (b as { products?: { name?: string } | null }).products?.name ?? "scooter";
  const link = `${BUSINESS.site}/booking/${b.public_token}`;

  await sendWhatsAppText({
    to: b.phone,
    kind: "booking.placed",
    body: [
      `Booking ${b.human_id} confirmed for ${model}${b.colour ? ` (${b.colour})` : ""}.`,
      `Token paid: ${formatINR(Number(b.token_amount))}`,
      `Balance at delivery: ${formatINR(Number(b.balance_due))}`,
      `Follow your booking: ${link}`,
    ].join("\n"),
  });

  const o = await owner();
  if (o.enabled) {
    await sendWhatsAppText({
      to: o.phone,
      kind: "booking.placed.owner",
      body: `New booking ${b.human_id}: ${model} for ${b.customer_name} (${b.phone}${b.alternate_phone ? ` · Alt: ${b.alternate_phone}` : ""}). Token ${formatINR(Number(b.token_amount))}.`,
    });
  }
}

export async function notifyBookingStatus(bookingId: string, status: string, note?: string | null): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const { data: b } = await supabaseAdmin
    .from("vehicle_bookings")
    .select("human_id, phone, public_token, balance_due, products(name)")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return;
  const model = (b as { products?: { name?: string } | null }).products?.name ?? "your scooter";
  const extra =
    status === "ready_for_delivery"
      ? `\nBalance payable at delivery: ${formatINR(Number(b.balance_due))}`
      : "";
  await sendWhatsAppText({
    to: b.phone,
    kind: "booking.status",
    body: `Booking ${b.human_id} (${model}) — ${bookingStatusLabel(status)}.${note ? `\n${note}` : ""}${extra}\n${BUSINESS.site}/booking/${b.public_token}`,
  });
}

/** Service reminders for schedules falling due in the next week. */
export async function sendServiceReminders(): Promise<{ sent: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const soon = new Date();
  soon.setDate(soon.getDate() + 7);

  const { data: rows } = await supabaseAdmin
    .from("service_schedule")
    .select("id, label, due_on, vehicle_registrations(owner_name, phone, products(name))")
    .eq("status", "due")
    .is("reminded_at", null)
    .lte("due_on", soon.toISOString().slice(0, 10))
    .limit(50);

  let sent = 0;
  for (const row of rows ?? []) {
    const reg = (row as { vehicle_registrations?: { owner_name?: string; phone?: string; products?: { name?: string } | null } | null })
      .vehicle_registrations;
    if (!reg?.phone) continue;
    const res = await sendWhatsAppText({
      to: reg.phone,
      kind: "service.reminder",
      body: [
        `Hello ${reg.owner_name ?? "there"}, ${row.label} for your ${reg.products?.name ?? "scooter"} is due on ${row.due_on}.`,
        `Book a slot: ${BUSINESS.site}/service`,
      ].join("\n"),
    });
    await supabaseAdmin.from("service_schedule").update({ reminded_at: new Date().toISOString() }).eq("id", row.id);
    if (res.ok) sent += 1;
  }
  return { sent };
}
