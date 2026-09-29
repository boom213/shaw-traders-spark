export type ReconciliationState = "attention" | "pending" | "failed" | "mismatched" | "matched" | "unavailable";
export type LocalPaymentSnapshot = { totalRupees: number; paymentStatus: string; providerOrderId: string | null; providerPaymentId: string | null; needsPaymentReview: boolean };
export type ProviderPaymentSnapshot = { id: string; orderId: string | null; amountPaise: number; currency: string; status: string };

export function classifyRazorpayPayment(local: LocalPaymentSnapshot, providerOrder: { id: string; amount: number; currency: string; status: string } | null, payments: ProviderPaymentSnapshot[]) {
  const payment = payments.find((item) => item.id === local.providerPaymentId) ?? payments.find((item) => item.status === "captured") ?? payments[0] ?? null;
  if (local.needsPaymentReview) return { state: "attention" as const, reason: "This order already requires an audited payment review.", payment };
  if (!local.providerOrderId) return { state: "mismatched" as const, reason: "The local order has no Razorpay order ID.", payment };
  if (!providerOrder) return { state: "mismatched" as const, reason: "Razorpay could not find the saved provider order.", payment };
  const expected = Math.round(local.totalRupees * 100);
  if (providerOrder.id !== local.providerOrderId) return { state: "mismatched" as const, reason: "The provider order ID does not match.", payment };
  if (providerOrder.amount !== expected) return { state: "mismatched" as const, reason: "The Razorpay order amount does not match the local total.", payment };
  if (providerOrder.currency !== "INR") return { state: "mismatched" as const, reason: "The Razorpay order currency is not INR.", payment };
  if (payment?.orderId && payment.orderId !== local.providerOrderId) return { state: "mismatched" as const, reason: "The payment belongs to another provider order.", payment };
  if (payment && payment.amountPaise !== expected) return { state: "mismatched" as const, reason: "The payment amount does not match the local total.", payment };
  if (payment && payment.currency !== "INR") return { state: "mismatched" as const, reason: "The payment currency is not INR.", payment };
  if (payment?.status === "failed") return { state: "failed" as const, reason: "Razorpay reports that the latest payment attempt failed.", payment };
  if (local.paymentStatus === "paid" && payment?.status !== "captured") return { state: "mismatched" as const, reason: "Marked paid locally, but Razorpay has no captured payment.", payment };
  if (local.paymentStatus !== "paid" && payment?.status === "captured") return { state: "mismatched" as const, reason: "Razorpay captured payment, but the local order is not paid.", payment };
  if (local.paymentStatus === "paid" && payment?.status === "captured") return { state: "matched" as const, reason: "The local order and captured Razorpay payment match.", payment };
  return { state: "pending" as const, reason: payment ? `Razorpay payment is ${payment.status}.` : `Razorpay order is ${providerOrder.status} with no payment yet.`, payment };
}