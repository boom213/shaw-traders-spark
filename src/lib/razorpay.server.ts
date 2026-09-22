import { createHmac, timingSafeEqual } from "crypto";

/** Razorpay credentials, read at call time (env is injected per request). */
export function razorpayKeys() {
  const keyId = process.env['RAZORPAY_KEY_ID'] ?? "";
  const keySecret = process.env['RAZORPAY_KEY_SECRET'] ?? "";
  return { keyId, keySecret, configured: keyId.length > 5 && keySecret.length > 5 };
}

export type RazorpayOrder = { id: string; amount: number; currency: string };

/** Create an order with Razorpay. Amount is in rupees and converted to paise here. */
export async function createRazorpayOrder(input: {
  amountRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ order: RazorpayOrder } | { error: string }> {
  const { keyId, keySecret, configured } = razorpayKeys();
  if (!configured) return { error: "Online payment is not switched on yet." };

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: Math.round(input.amountRupees * 100),
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
