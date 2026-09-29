import { describe, expect, it } from "vitest";
import { classifyPurchaseAccess } from "@/lib/purchase-access.server";

describe("retail purchase access", () => {
  it("allows a signed-in retail customer", () => {
    expect(classifyPurchaseAccess({ userId: "retail-user", customerType: "retail", isStaff: false })).toEqual({
      eligible: true,
      reason: "retail",
      userId: "retail-user",
    });
  });

  it.each([
    [{ userId: null, customerType: "retail", isStaff: false }, "guest"],
    [{ userId: "trade-user", customerType: "trade", isStaff: false }, "trade"],
    [{ userId: "staff-user", customerType: "retail", isStaff: true }, "staff"],
    [{ userId: "staff-trade", customerType: "trade", isStaff: true }, "staff"],
  ] as const)("blocks an ineligible account as %s", (input, reason) => {
    expect(classifyPurchaseAccess(input)).toEqual({ eligible: false, reason });
  });
});

describe("checkout enforcement wiring", () => {
  it("guards both new checkout and Razorpay retry on the server", async () => {
    const source = await import("node:fs/promises").then((fs) => fs.readFile("src/lib/checkout.functions.ts", "utf8"));
    expect(source.match(/retailPurchaseAccess\(\)/g)).toHaveLength(2);
    expect(source).toContain('.eq("profile_id", purchase.userId)');
  });
});