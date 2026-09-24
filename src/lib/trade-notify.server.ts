/** Trade account messages: WhatsApp to the owner and the applicant, plus email. */
import { BUSINESS } from "@/lib/catalog";

async function applicantContact(profileId: string): Promise<{ phone: string; email: string | null; name: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("full_name, phone, email")
    .eq("id", profileId)
    .maybeSingle();
  return { phone: String(data?.phone ?? ""), email: data?.email ?? null, name: String(data?.full_name ?? "there") };
}

async function record(kind: string, recipient: string, body: string, channel = "email") {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("notifications").insert({
    channel,
    recipient,
    kind,
    body,
    status: "queued",
  } as never);
}

/** A new or updated application has arrived. */
export async function notifyTradeApplication(
  profileId: string,
  businessName: string,
  extra?: { type?: string; volume?: string },
): Promise<void> {
  const { notifySettings } = await import("@/lib/notify.server");
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const settings = await notifySettings();
  if (!settings.enabled) return;
  const who = await applicantContact(profileId);

  await sendWhatsAppText({
    to: settings.ownerPhone,
    body: [
      "🧾 New trade account application",
      "",
      `Business: ${businessName}`,
      ...(extra?.type ? [`Type: ${extra.type}`] : []),
      ...(extra?.volume ? [`Monthly buying: ${extra.volume}`] : []),
      `Contact: ${who.name}${who.phone ? ` · ${who.phone}` : ""}`,
      "",
      `Review it here: ${BUSINESS.site}/manage/trade`,
    ].join("\n"),
    kind: "trade.application.owner",
  });
  if (who.email) await record("trade.application.owner.email", who.email, `Application received for ${businessName}.`);
}

/** Tell the applicant what was decided. */
export async function notifyTradeDecision(
  profileId: string,
  status: "approved" | "rejected" | "more_info_needed",
  note: string,
): Promise<void> {
  const { notifySettings } = await import("@/lib/notify.server");
  const { sendWhatsAppText } = await import("@/lib/whatsapp.server");
  const settings = await notifySettings();
  if (!settings.enabled) return;
  const who = await applicantContact(profileId);

  const lines =
    status === "approved"
      ? [
          `Good news ${who.name} — your trade account with ${BUSINESS.name} is approved.`,
          "You will now see your trade prices when you sign in.",
          `${BUSINESS.site}/trade`,
        ]
      : status === "more_info_needed"
        ? [
            `Hi ${who.name}, we need one more thing for your trade account:`,
            note || "Please send the missing document.",
            `Add it here: ${BUSINESS.site}/trade`,
          ]
        : [
            `Hi ${who.name}, we could not approve your trade account this time.`,
            note || "Please call us if you would like to know more.",
            `Call ${BUSINESS.phone}`,
          ];

  if (who.phone) {
    await sendWhatsAppText({ to: who.phone, body: lines.join("\n"), kind: `trade.application.${status}` });
  }
  if (who.email) await record(`trade.application.${status}.email`, who.email, lines.join("\n"));
}
