import { createHmac } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { createRazorpayOrder, verifyCheckoutSignature, verifyWebhookSignature, razorpayKeys } from "@/lib/razorpay.server";

const KEY_ID = "rzp_test_keyid123";
const KEY_SECRET = "test_secret_value_123";
const WEBHOOK_SECRET = "webhook_secret_value_123";

beforeEach(() => {
  process.env['RAZORPAY_KEY_ID'] = KEY_ID;
  process.env['RAZORPAY_KEY_SECRET'] = KEY_SECRET;
  process.env['RAZORPAY_WEBHOOK_SECRET'] = WEBHOOK_SECRET;
});

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("hex");

describe("razorpay key configuration", () => {
  it("reports configured only when both keys are present", () => {
    expect(razorpayKeys().configured).toBe(true);
    process.env['RAZORPAY_KEY_SECRET'] = "";
    expect(razorpayKeys().configured).toBe(false);
  });

  it("rejects orders below Razorpay's minimum before making a request", async () => {
    await expect(createRazorpayOrder({ amountRupees: 0.99, receipt: "TEST-1" })).resolves.toEqual({
      error: "Online payment requires a minimum order total of ₹1.",
    });
  });
});

describe("checkout handshake signature", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";

  it("accepts a signature produced with the real key secret", () => {
    const good = sign(`${orderId}|${paymentId}`, KEY_SECRET);
    expect(verifyCheckoutSignature(orderId, paymentId, good)).toBe(true);
  });

  it("rejects a signature made with a different secret", () => {
    const forged = sign(`${orderId}|${paymentId}`, "attacker_secret");
    expect(verifyCheckoutSignature(orderId, paymentId, forged)).toBe(false);
  });

  it("rejects a signature replayed against a different order or payment", () => {
    const good = sign(`${orderId}|${paymentId}`, KEY_SECRET);
    expect(verifyCheckoutSignature("order_OTHER", paymentId, good)).toBe(false);
    expect(verifyCheckoutSignature(orderId, "pay_OTHER", good)).toBe(false);
  });

  it("rejects an empty or truncated signature", () => {
    const good = sign(`${orderId}|${paymentId}`, KEY_SECRET);
    expect(verifyCheckoutSignature(orderId, paymentId, "")).toBe(false);
    expect(verifyCheckoutSignature(orderId, paymentId, good.slice(0, 40))).toBe(false);
  });

  it("rejects everything when the keys are not configured", () => {
    const good = sign(`${orderId}|${paymentId}`, KEY_SECRET);
    process.env['RAZORPAY_KEY_ID'] = "";
    process.env['RAZORPAY_KEY_SECRET'] = "";
    expect(verifyCheckoutSignature(orderId, paymentId, good)).toBe(false);
  });
});

describe("webhook signature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });

  it("accepts a body signed with the webhook secret", () => {
    expect(verifyWebhookSignature(body, sign(body, WEBHOOK_SECRET))).toBe(true);
  });

  it("rejects a tampered body", () => {
    const signature = sign(body, WEBHOOK_SECRET);
    expect(verifyWebhookSignature(body.replace("pay_1", "pay_2"), signature)).toBe(false);
  });

  it("rejects a body signed with the api key secret instead of the webhook secret", () => {
    expect(verifyWebhookSignature(body, sign(body, KEY_SECRET))).toBe(false);
  });

  it("rejects when no webhook secret is set", () => {
    const signature = sign(body, WEBHOOK_SECRET);
    process.env['RAZORPAY_WEBHOOK_SECRET'] = "";
    expect(verifyWebhookSignature(body, signature)).toBe(false);
  });
});
