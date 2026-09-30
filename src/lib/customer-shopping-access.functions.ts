import { createServerFn } from "@tanstack/react-start";
import { manageFallbackForRole } from "@/lib/staff-permissions";

export type CustomerPageAccess =
  | { kind: "customer" }
  | { kind: "guest" }
  | { kind: "staff"; fallback: "/manage" | "/manage/orders" };

/** Resolve customer-page access from verified account and staff records. */
export const customerPageAccess = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerPageAccess> => {
  const { tradeAccount } = await import("@/lib/trade.server");
  const account = await tradeAccount();
  if (!account.userId) return { kind: "guest" };

  const { staffContext } = await import("@/lib/staff.server");
  const staff = await staffContext();
  if (staff) return { kind: "staff", fallback: manageFallbackForRole(staff.role) };
  return { kind: "customer" };
});