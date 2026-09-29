import { describe, expect, it } from "vitest";
import { paymentHeadline, paymentStatusLabel } from "@/lib/catalog";

describe("customer payment status", () => {
  it.each([
    ["paid", "Paid", "Thank you, your order is confirmed"],
    ["failed", "Payment failed", "Payment failed for this order"],
    ["pending", "Payment pending", "Your order is awaiting payment confirmation"],
    ["cod_pending", "Pay on delivery", "Your order is confirmed — pay on delivery"],
    ["refunded", "Refunded", "This payment has been refunded"],
  ])("presents %s clearly", (status, label, headline) => {
    expect(paymentStatusLabel(status)).toBe(label);
    expect(paymentHeadline(status)).toBe(headline);
  });

  it("turns an unfamiliar stored value into readable text", () => {
    expect(paymentStatusLabel("manual_review")).toBe("Manual Review");
  });
});