import { createFileRoute } from "@tanstack/react-router";

type RazorpayPayload = {
  event?: string;
  payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } };
};

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";

        const { verifyWebhookSignature } = await import("@/lib/razorpay.server");
        if (!verifyWebhookSignature(raw, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let body: RazorpayPayload;
        try {
          body = JSON.parse(raw) as RazorpayPayload;
        } catch {
          return new Response("Bad payload", { status: 400 });
        }

        const eventId =
          request.headers.get("x-razorpay-event-id") ??
          `${body.event ?? "event"}:${body.payload?.payment?.entity?.id ?? raw.length}`;
        const providerOrderId = body.payload?.payment?.entity?.order_id ?? null;
        const paymentId = body.payload?.payment?.entity?.id ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Look the order up first so the event row can point at it.
        let orderId: string | null = null;
        if (providerOrderId) {
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("provider_order_id", providerOrderId)
            .maybeSingle();
          orderId = order?.id ?? null;
        }

        // Idempotency: the unique (provider, event_id) index makes a retry a no-op.
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("payment_events")
          .insert({
            provider: "razorpay",
            event_id: eventId,
            event_type: body.event ?? null,
            order_id: orderId,
            payload: body as never,
          })
          .select("id")
          .maybeSingle();

        if (insertError) {
          // Duplicate event: already handled.
          return new Response("ok", { status: 200 });
        }
        if (!inserted) return new Response("ok", { status: 200 });

        if ((body.event === "payment.captured" || body.event === "order.paid") && orderId && paymentId) {
          await supabaseAdmin.rpc("mark_order_paid", { p_order_id: orderId, p_payment_id: paymentId });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
