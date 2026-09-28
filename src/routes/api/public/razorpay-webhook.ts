import { createFileRoute } from "@tanstack/react-router";

type RazorpayPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; status?: string; error_description?: string; error_reason?: string } };
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } };
  };
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

        const refund = body.payload?.refund?.entity;
        const eventId =
          request.headers.get("x-razorpay-event-id") ??
          `${body.event ?? "event"}:${body.payload?.payment?.entity?.id ?? refund?.id ?? raw.length}`;
        const providerOrderId = body.payload?.payment?.entity?.order_id ?? null;
        const paymentId = body.payload?.payment?.entity?.id ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Look the order up first so the event row can point at it.
        let orderId: string | null = null;
        let bookingId: string | null = null;
        if (providerOrderId) {
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("provider_order_id", providerOrderId)
            .maybeSingle();
          orderId = order?.id ?? null;
          if (!orderId) {
            const { data: booking } = await supabaseAdmin
              .from("vehicle_bookings")
              .select("id")
              .eq("provider_order_id", providerOrderId)
              .maybeSingle();
            bookingId = booking?.id ?? null;
          }
        } else if (refund?.payment_id) {
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("provider_payment_id", refund.payment_id)
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
            booking_id: bookingId,
            payload: body as never,
          })
          .select("id")
          .maybeSingle();

        if (insertError) {
          const { isDuplicateEventError } = await import("@/lib/webhook-errors");
          if (isDuplicateEventError(insertError)) {
            // Already handled: tell Razorpay to stop retrying.
            return new Response("ok", { status: 200 });
          }
          // A real failure. Razorpay must retry, or a paid order stays unmarked.
          console.error("razorpay webhook: could not record event", insertError);
          return new Response("Could not record event", { status: 500 });
        }
        if (!inserted) return new Response("Could not record event", { status: 500 });

        if ((body.event === "payment.captured" || body.event === "order.paid") && orderId && paymentId) {
          const { data: markedPaid, error: markError } = await supabaseAdmin.rpc("mark_order_paid", { p_order_id: orderId, p_payment_id: paymentId });
          if (markError) {
            console.error("razorpay webhook: payment update failed", markError);
            return new Response("Could not update payment", { status: 500 });
          }
          if (markedPaid) {
            const { notifyOrderPlaced } = await import("@/lib/notify.server");
            await notifyOrderPlaced(orderId);
          }
        }

        if ((body.event === "payment.captured" || body.event === "order.paid") && bookingId && paymentId) {
          const { data: markedPaid, error: markError } = await supabaseAdmin.rpc("mark_booking_paid", {
            p_booking_id: bookingId,
            p_payment_id: paymentId,
          });
          if (markError) {
            console.error("razorpay webhook: booking payment update failed", markError);
            return new Response("Could not update booking payment", { status: 500 });
          }
          if (markedPaid) {
            const { notifyBookingStatus } = await import("@/lib/vehicle-notify.server");
            await notifyBookingStatus(bookingId, "booked", "Token amount received — thank you.");
          }
        }

        if ((body.event === "refund.created" || body.event === "refund.processed") && refund?.id && orderId) {
          const amount = Math.max(0, Number(refund.amount ?? 0) / 100);
          const { error: refundError } = await supabaseAdmin.from("refunds").upsert({
            order_id: orderId,
            amount,
            method: "razorpay",
            provider_refund_id: refund.id,
            provider_payment_id: refund.payment_id ?? null,
            status: refund.status ?? (body.event === "refund.processed" ? "processed" : "created"),
            note: "Synchronized from Razorpay",
            created_by: "razorpay",
          }, { onConflict: "provider_refund_id" });
          if (refundError) {
            console.error("razorpay webhook: refund update failed", refundError);
            return new Response("Could not update refund", { status: 500 });
          }
          const { error: syncError } = await supabaseAdmin.rpc("sync_order_refund_total", { p_order_id: orderId });
          if (syncError) return new Response("Could not synchronize refund", { status: 500 });
        }

        if (body.event === "payment.failed" && orderId) {
          const { data: order } = await supabaseAdmin.from("orders").select("status, payment_status").eq("id", orderId).maybeSingle();
          if (order?.payment_status === "pending") {
            const reason = body.payload?.payment?.entity?.error_description ?? body.payload?.payment?.entity?.error_reason;
            const { error: failureError } = await supabaseAdmin.from("order_events").insert({
              order_id: orderId,
              status: order.status,
              note: `Razorpay reported a failed payment attempt${reason ? ` — ${String(reason).slice(0, 180)}` : ""}`,
              created_by: "razorpay",
            });
            if (failureError) return new Response("Could not record payment failure", { status: 500 });
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
