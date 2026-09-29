import { createHmac, timingSafeEqual } from "crypto";

/** Razorpay credentials, read at call time (env is injected per request). */
export function razorpayKeys() {
  const keyId = process.env['RAZORPAY_KEY_ID'] ?? "";
  const keySecret = process.env['RAZORPAY_KEY_SECRET'] ?? "";
  return { keyId, keySecret, configured: keyId.length > 5 && keySecret.length > 5 };
}

export type RazorpayOrder = { id: string; amount: number; currency: string };

async function razorpayGet<T>(path: string): Promise<{ data: T } | { error: string }> {
  const keys = razorpayKeys();
  if (!keys.configured) return { error: "Razorpay credentials are not configured." };
  try {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, { headers: { authorization: `Basic ${Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64")}` }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) { console.error("razorpay review failed", response.status, (await response.text()).slice(0, 300)); return { error: response.status === 404 ? "Razorpay could not find this order." : "Razorpay could not be checked right now." }; }
    return { data: await response.json() as T };
  } catch (error) { console.error("razorpay review failed", error); return { error: "Razorpay could not be checked right now." }; }
}

export async function fetchRazorpayOrderWithPayments(orderId: string): Promise<{ order: RazorpayOrder & { status: string }; payments: { id: string; orderId: string | null; amountPaise: number; currency: string; status: string }[] } | { error: string }> {
  type LivePayment = { id: string; order_id?: string | null; amount: number; currency: string; status: string };
  const [order, payments] = await Promise.all([razorpayGet<RazorpayOrder & { status: string }>(`/orders/${encodeURIComponent(orderId)}`), razorpayGet<{ items?: LivePayment[] }>(`/orders/${encodeURIComponent(orderId)}/payments`)]);
  if ("error" in order) return order;
  if ("error" in payments) return payments;
  return { order: order.data, payments: (payments.data.items ?? []).map((item) => ({ id: item.id, orderId: item.order_id ?? null, amountPaise: Number(item.amount), currency: item.currency, status: item.status })) };
}

/** Create an order with Razorpay. Amount is in rupees and converted to paise here. */
export async function createRazorpayOrder(input: {
  amountRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ order: RazorpayOrder } | { error: string }> {
  const { keyId, keySecret, configured } = razorpayKeys();
  if (!configured) return { error: "Online payment is not switched on yet." };

  const amountPaise = Math.round(input.amountRupees * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < 100) {
    return { error: "Online payment requires a minimum order total of ₹1." };
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes ?? {},
      payment_capture: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("razorpay order failed", res.status, text);
    return { error: "Could not start the payment. Please try again." };
  }
  const order = (await res.json()) as RazorpayOrder;
  return { order };
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout handshake signature: HMAC(order_id|payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret, configured } = razorpayKeys();
  if (!configured || !signature) return false;
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(signature, expected);
}

/** Webhook signature: HMAC of the raw body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env['RAZORPAY_WEBHOOK_SECRET'] ?? "";
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(signature, expected);
}

/** Refund a captured payment. Amount in rupees. */
export async function refundRazorpayPayment(
  paymentId: string,
  amountRupees: number,
): Promise<{ refund: { id: string; status: string } } | { error: string }> {
  const keys = razorpayKeys();
  if (!keys.configured) return { error: "Online payments are not connected, so this refund must be recorded manually." };
  try {
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${keys.keyId}:${keys.keySecret}`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: Math.round(amountRupees * 100), speed: "normal" }),
    });
    const body = await res.text();
    if (!res.ok) return { error: `Refund failed [${res.status}]: ${body.slice(0, 300)}` };
    const json = JSON.parse(body);
    return { refund: { id: String(json.id), status: String(json.status ?? "processed") } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Refund request failed" };
  }
}
