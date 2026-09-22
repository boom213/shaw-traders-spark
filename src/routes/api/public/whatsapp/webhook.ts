import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookRequest } from "@lovable.dev/webhooks-js";

type Row = Record<string, any>;

/** Delivery callbacks and incoming messages from WhatsApp. */
export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env['WHATSAPP_API_KEY'];
        if (!secret) return new Response("Not configured", { status: 503 });

        const verified = await verifyWebhookRequest<Row>({
          req: request,
          secret,
          maxBodyBytes: 4 * 1024 * 1024,
        }).catch(() => null);
        if (!verified) return new Response("Invalid signature", { status: 401 });

        const deliveryId = request.headers.get("x-lovable-delivery") ?? "";
        const event = request.headers.get("x-lovable-event") ?? "";
        if (!deliveryId || !event) return new Response("Missing delivery headers", { status: 400 });

        const payload: Row = (verified.payload as Row) ?? safeJson(verified.body);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing, error: readError } = await supabaseAdmin
          .from("whatsapp_webhook_events")
          .select("id, processed_at")
          .eq("delivery_id", deliveryId)
          .maybeSingle();
        if (readError) return new Response("Storage error", { status: 500 });

        let rowId = existing?.id as string | undefined;
        if (existing?.processed_at) return new Response("ok");
        if (!rowId) {
          const { data: inserted, error: writeError } = await supabaseAdmin
            .from("whatsapp_webhook_events")
            .insert({ delivery_id: deliveryId, event, payload: payload as never } as never)
            .select("id")
            .maybeSingle();
          if (writeError || !inserted) return new Response("Storage error", { status: 500 });
          rowId = inserted.id as string;
        }

        try {
          await processDelivery(event, payload);
          await supabaseAdmin
            .from("whatsapp_webhook_events")
            .update({ processed_at: new Date().toISOString(), processing_error: null } as never)
            .eq("id", rowId);
        } catch (e) {
          await supabaseAdmin
            .from("whatsapp_webhook_events")
            .update({ processing_error: e instanceof Error ? e.message : "processing failed" } as never)
            .eq("id", rowId);
          return new Response("Processing failed", { status: 500 });
        }

        await drainPending();
        return new Response("ok");
      },
    },
  },
});

function safeJson(text: string): Row {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function processDelivery(event: string, payload: Row): Promise<void> {
  if (event !== "whatsapp.status") return;
  const { applyMessageStatus } = await import("@/lib/whatsapp.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const statuses = (payload?.['entry']?.[0]?.['changes']?.[0]?.['value']?.['statuses'] ?? []) as Row[];
  for (const s of statuses) {
    const id = String(s['id'] ?? "");
    if (!id) continue;
    const at = s['timestamp'] ? new Date(Number(s['timestamp']) * 1000).toISOString() : new Date().toISOString();
    const error = Array.isArray(s['errors']) && s['errors'].length ? JSON.stringify(s['errors']).slice(0, 500) : null;
    const applied = await applyMessageStatus(id, String(s['status'] ?? "sent"), error, at);
    if (!applied) {
      // The outbound row is not saved yet — keep the callback for reconciliation.
      await supabaseAdmin
        .from("whatsapp_pending_statuses")
        .upsert({ message_id: id, status: String(s['status'] ?? "sent"), error, status_at: at } as never, {
          onConflict: "message_id,status",
        });
    }
  }
}

/** Retry a small batch of callbacks that could not be matched earlier. */
async function drainPending(): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { applyMessageStatus } = await import("@/lib/whatsapp.server");
  const { data: rows } = await supabaseAdmin
    .from("whatsapp_pending_statuses")
    .select("id, message_id, status, error, status_at")
    .order("created_at", { ascending: true })
    .limit(20);
  for (const r of rows ?? []) {
    const applied = await applyMessageStatus(String(r.message_id), String(r.status), r.error ?? null, String(r.status_at));
    const stale = Date.now() - Date.parse(String(r.status_at)) > 24 * 60 * 60 * 1000;
    if (applied || stale) await supabaseAdmin.from("whatsapp_pending_statuses").delete().eq("id", r.id);
  }
}
