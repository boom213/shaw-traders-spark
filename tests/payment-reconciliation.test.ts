import { describe, expect, it } from "vitest";
import { classifyRazorpayPayment } from "../src/lib/payment-reconciliation";

const local = { totalRupees: 1250, paymentStatus: "paid", providerOrderId: "order_1", providerPaymentId: "pay_1", needsPaymentReview: false };
const order = { id: "order_1", amount: 125000, currency: "INR", status: "paid" };
const payment = { id: "pay_1", orderId: "order_1", amountPaise: 125000, currency: "INR", status: "captured" };

describe("Razorpay reconciliation", () => {
  it("matches a captured payment with the same amount and currency", () => expect(classifyRazorpayPayment(local, order, [payment]).state).toBe("matched"));
  it("flags amount mismatches", () => expect(classifyRazorpayPayment(local, { ...order, amount: 124900 }, [payment]).state).toBe("mismatched"));
  it("flags non-INR payments", () => expect(classifyRazorpayPayment(local, order, [{ ...payment, currency: "USD" }]).state).toBe("mismatched"));
  it("flags failed attempts", () => expect(classifyRazorpayPayment({ ...local, paymentStatus: "pending" }, order, [{ ...payment, status: "failed" }]).state).toBe("failed"));
  it("prioritizes an existing late-payment review", () => expect(classifyRazorpayPayment({ ...local, needsPaymentReview: true }, order, [payment]).state).toBe("attention"));
  it("flags local paid state without a captured provider payment", () => expect(classifyRazorpayPayment(local, order, []).state).toBe("mismatched"));
  it("keeps authorized-but-uncaptured payments pending", () => expect(classifyRazorpayPayment({ ...local, paymentStatus: "pending" }, order, [{ ...payment, status: "authorized" }]).state).toBe("pending"));
});