import { createServerFn } from "@tanstack/react-start";
import { CANCELLABLE_STATUSES, CANCEL_REASONS, RETURNABLE_STATUSES, RETURN_REASONS } from "@/lib/order-reasons";

type OrderRow = {
  id: string;
  human_id: string;
  status: string;
  payment_status: string;
  contact_phone: string | null;
  address: Record<string, string>;
  profile_id: string | null;
};

/** Same access rules as the order page: owner of the order, staff, or last-4 proof. */
async function authorize(token: string, phoneLast4: string): Promise<OrderRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("orders")
    .select("id, human_id, status, payment_status, contact_phone, address, profile_id")
    .eq("public_token", token)
    .maybeSingle();
  if (!row) return null;
  const order = row as unknown as OrderRow;

  const { staffContext } = await import("@/lib/staff.server");
  if (await staffContext()) return order;

  const { currentUserId } = await import("@/lib/auth.server");
  const userId = await currentUserId();
  if (userId && order.profile_id === userId) return order;

  const digits = String(order.contact_phone ?? order.address?.['phone'] ?? "").replace(/\D/g, "");
  if (phoneLast4.length === 4 && digits.slice(-4) === phoneLast4) return order;
  return null;
}

/** Customer asks to cancel or return an order. */
export const requestOrderChange = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; phoneLast4?: string; kind: string; reason: string; details?: string }) => ({
    token: String(data?.token ?? ""),
    phoneLast4: String(data?.phoneLast4 ?? "").replace(/\D/g, "").slice(-4),
    kind: data?.kind === "return" ? ("return" as const) : ("cancellation" as const),
    reason: String(data?.reason ?? "").slice(0, 120),
    details: String(data?.details ?? "").trim().slice(0, 600),
  }))
  .handler(async ({ data }): Promise<{ ok: true } | { error: string }> => {
    const order = await authorize(data.token, data.phoneLast4);
    if (!order) return { error: "We could not confirm this order." };

    const allowed = data.kind === "return" ? RETURN_REASONS : CANCEL_REASONS;
    if (!allowed.includes(data.reason)) return { error: "Please pick a reason from the list." };

    const stages = data.kind === "return" ? RETURNABLE_STATUSES : CANCELLABLE_STATUSES;
    if (!stages.includes(order.status)) {
      return {
        error:
          data.kind === "return"
            ? "Returns can only be requested after the order is delivered."
            : "This order has already been dispatched, so it cannot be cancelled here. Please message us on WhatsApp.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: open } = await supabaseAdmin
      .from("order_requests")
      .select("id")
      .eq("order_id", order.id)
      .eq("status", "pending")
      .maybeSingle();
    if (open) return { error: "We already have a request for this order and are looking at it." };

    const { error } = await supabaseAdmin.from("order_requests").insert({
      order_id: order.id,
      kind: data.kind,
      reason: data.reason,
      details: data.details || null,
    } as never);
    if (error) return { error: "Could not send your request. Please try again." };

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      status: order.status as never,
      note: `${data.kind === "return" ? "Return" : "Cancellation"} requested by the customer — ${data.reason}`,
      created_by: "customer",
    } as never);

    const { notifyOrderRequest } = await import("@/lib/notify.server");
    await notifyOrderRequest(order.id, data.kind, data.reason, data.details);
    return { ok: true };
  });

/** Download the GST invoice for an order, as base64 PDF bytes. */
export const getInvoice = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; phoneLast4?: string }) => ({
    token: String(data?.token ?? ""),
    phoneLast4: String(data?.phoneLast4 ?? "").replace(/\D/g, "").slice(-4),
  }))
  .handler(async ({ data }): Promise<{ base64: string; fileName: string } | { error: string }> => {
    const order = await authorize(data.token, data.phoneLast4);
    if (!order) return { error: "We could not confirm this order." };
    const { invoicePdfBase64 } = await import("@/lib/invoice.server");
    return invoicePdfBase64(order.id);
  });
