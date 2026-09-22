import { createServerFn } from "@tanstack/react-start";

export type CartItemInput = { productId: string; qty: number };

export type Address = {
  name: string;
  phone: string;
  line1: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
};

export type StartCheckoutResult =
  | { error: string }
  | {
      orderId: string;
      humanId: string;
      token: string;
      total: number;
      paymentStatus: string;
      razorpay: { keyId: string; orderId: string; amountPaise: number } | null;
    };

const cleanItems = (items: CartItemInput[] | undefined) =>
  (items ?? [])
    .map((i) => ({ product_id: String(i.productId), qty: Math.max(1, Math.min(99, Number(i.qty) || 1)) }))
    .filter((i) => /^[0-9a-f-]{36}$/i.test(i.product_id))
    .slice(0, 50);

const cleanAddress = (a: Address | undefined) => ({
  name: String(a?.name ?? "").trim().slice(0, 120),
  phone: String(a?.phone ?? "").replace(/\D/g, "").slice(-10),
  line1: String(a?.line1 ?? "").trim().slice(0, 300),
  landmark: String(a?.landmark ?? "").trim().slice(0, 160),
  city: String(a?.city ?? "").trim().slice(0, 120),
  state: String(a?.state ?? "").trim().slice(0, 120),
  pincode: String(a?.pincode ?? "").replace(/\D/g, "").slice(0, 6),
});

const friendly = (message: string) =>
  message.replace(/^.*?(?:ERROR|error):\s*/, "").replace(/\s*CONTEXT:[\s\S]*$/, "").trim() ||
  "Could not place the order. Please try again.";

/** Is online payment available (are the Razorpay keys saved)? */
export const paymentsAvailable = createServerFn({ method: "GET" }).handler(async () => {
  const { razorpayKeys } = await import("@/lib/razorpay.server");
  return { online: razorpayKeys().configured };
});

/**
 * Create the order. All prices, GST, shipping, coupon and COD rules are
 * recomputed in the database; nothing the browser sends about money is trusted.
 */
export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: { items: CartItemInput[]; address: Address; shippingCode: string; paymentMethod: string; coupon?: string }) => ({
    items: cleanItems(data?.items),
    address: cleanAddress(data?.address),
    shippingCode: ["standard", "express", "pickup"].includes(String(data?.shippingCode)) ? String(data?.shippingCode) : "standard",
    paymentMethod: ["UPI", "Card", "Netbanking", "Wallet", "Cash on Delivery"].includes(String(data?.paymentMethod))
      ? String(data?.paymentMethod)
      : "UPI",
    coupon: String(data?.coupon ?? "").trim().slice(0, 40) || null,
  }))
  .handler(async ({ data }): Promise<StartCheckoutResult> => {
    if (data.items.length === 0) return { error: "Your cart is empty." };
    if (data.address.phone.length !== 10 || data.address.pincode.length !== 6 || !data.address.name || !data.address.line1) {
      return { error: "Please complete your delivery address." };
    }

    const { publicClient } = await import("@/lib/supabase-public.server");
    const { data: rows, error } = await publicClient().rpc("create_order", {
      p_items: data.items as never,
      p_address: data.address as never,
      p_payment_method: data.paymentMethod,
      p_shipping_code: data.shippingCode,
      p_coupon_code: data.coupon,
    });
    if (error) return { error: friendly(error.message) };

    const row = (Array.isArray(rows) ? rows[0] : rows) as
      | { order_id: string; human_id: string; public_token: string; total: number; payment_status: string }
      | undefined;
    if (!row) return { error: "Could not place the order. Please try again." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Attach the order to the signed-in customer, verified server-side.
    const { currentUserId } = await import("@/lib/auth.server");
    const userId = await currentUserId();
    if (userId) await supabaseAdmin.from("orders").update({ profile_id: userId }).eq("id", row.order_id);

    const cod = data.paymentMethod === "Cash on Delivery";
    if (cod) {
      return {
        orderId: row.order_id,
        humanId: row.human_id,
        token: row.public_token,
        total: Number(row.total),
        paymentStatus: row.payment_status,
        razorpay: null,
      };
    }

    const { createRazorpayOrder, razorpayKeys } = await import("@/lib/razorpay.server");
    const created = await createRazorpayOrder({
      amountRupees: Number(row.total),
      receipt: row.human_id,
      notes: { order_id: row.order_id, human_id: row.human_id },
    });
    if ("error" in created) {
      await supabaseAdmin.rpc("release_order", { p_order_id: row.order_id, p_reason: "Payment could not be started" });
      return { error: created.error };
    }

    await supabaseAdmin
      .from("orders")
      .update({ provider_order_id: created.order.id, payment_provider: "razorpay" })
      .eq("id", row.order_id);

    return {
      orderId: row.order_id,
      humanId: row.human_id,
      token: row.public_token,
      total: Number(row.total),
      paymentStatus: row.payment_status,
      razorpay: { keyId: razorpayKeys().keyId, orderId: created.order.id, amountPaise: Math.round(Number(row.total) * 100) },
    };
  });

/** Verify the signature Razorpay hands back, then mark the order paid. */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; razorpayOrderId: string; paymentId: string; signature: string }) => ({
    orderId: String(data?.orderId ?? ""),
    razorpayOrderId: String(data?.razorpayOrderId ?? ""),
    paymentId: String(data?.paymentId ?? ""),
    signature: String(data?.signature ?? ""),
  }))
  .handler(async ({ data }): Promise<{ paid: boolean; error?: string }> => {
    if (!/^[0-9a-f-]{36}$/i.test(data.orderId)) return { paid: false, error: "Unknown order." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, provider_order_id, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { paid: false, error: "Unknown order." };
    if (order.payment_status === "paid") return { paid: true };
    if (order.provider_order_id !== data.razorpayOrderId) return { paid: false, error: "Payment does not match this order." };

    const { verifyCheckoutSignature } = await import("@/lib/razorpay.server");
    if (!verifyCheckoutSignature(data.razorpayOrderId, data.paymentId, data.signature)) {
      return { paid: false, error: "We could not verify this payment. If money was taken it will be confirmed shortly." };
    }

    await supabaseAdmin.rpc("mark_order_paid", { p_order_id: data.orderId, p_payment_id: data.paymentId });
    return { paid: true };
  });

/** Current payment state, used by the retry screen. */
export const paymentState = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.orderId)) return { status: "unknown" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select("payment_status, human_id, total, public_token")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!row) return { status: "unknown" as const };
    return {
      status: String(row.payment_status),
      humanId: String(row.human_id),
      total: Number(row.total),
      token: String(row.public_token),
    };
  });

/** Start a fresh Razorpay attempt for an order that is still awaiting payment. */
export const retryPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.orderId)) return { error: "Unknown order." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, human_id, total, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { error: "Unknown order." };
    if (order.payment_status === "paid") return { error: "This order is already paid." };
    if (order.payment_status !== "pending") return { error: "This order can no longer be paid online." };

    const { createRazorpayOrder, razorpayKeys } = await import("@/lib/razorpay.server");
    const created = await createRazorpayOrder({
      amountRupees: Number(order.total),
      receipt: `${order.human_id}-r`,
      notes: { order_id: order.id, human_id: order.human_id },
    });
    if ("error" in created) return { error: created.error };

    await supabaseAdmin.from("orders").update({ provider_order_id: created.order.id }).eq("id", order.id);
    return {
      keyId: razorpayKeys().keyId,
      razorpayOrderId: created.order.id,
      amountPaise: Math.round(Number(order.total) * 100),
    };
  });

/** Customer closed or cancelled the payment: put the reserved stock back. */
export const abandonPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => ({ orderId: String(data?.orderId ?? "") }))
  .handler(async ({ data }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.orderId)) return { ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("release_order", { p_order_id: data.orderId, p_reason: "Payment cancelled by the customer" });
    return { ok: true as const };
  });
