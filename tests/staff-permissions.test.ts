import { describe, expect, it } from "vitest";
import { can, capabilityForManagePath, manageFallbackForRole } from "../src/lib/staff-permissions";

describe("staff financial permissions", () => {
  it("keeps Reports and Trade & Credit hidden from managers", () => {
    expect(can("manager", "reports")).toBe(false);
    expect(can("manager", "trade")).toBe(false);
  });

  it("allows owners and super admins to access financial sections", () => {
    expect(can("owner", "reports")).toBe(true);
    expect(can("owner", "trade")).toBe(true);
    expect(can("super_admin", "reports")).toBe(true);
    expect(can("super_admin", "trade")).toBe(true);
  });
});

describe("online sales permissions", () => {
  it("allows only online orders for the restricted role", () => {
    expect(can("online_sales", "online-orders")).toBe(true);
    expect(can("online_sales", "operations")).toBe(false);
    expect(can("online_sales", "counter-sales")).toBe(false);
    expect(can("online_sales", "reports")).toBe(false);
    expect(can("online_sales", "staff.manage")).toBe(false);
  });

  it("keeps online orders available to every existing staff role", () => {
    for (const role of ["staff", "manager", "owner", "super_admin"] as const) expect(can(role, "online-orders")).toBe(true);
  });

  it("maps order pages and denied fallbacks correctly", () => {
    expect(capabilityForManagePath("/manage/orders")).toBe("online-orders");
    expect(capabilityForManagePath("/manage/orders/example")).toBe("online-orders");
    expect(manageFallbackForRole("online_sales")).toBe("/manage/orders");
    expect(manageFallbackForRole("staff")).toBe("/manage");
  });
});