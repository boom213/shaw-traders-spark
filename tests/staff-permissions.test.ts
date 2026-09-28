import { describe, expect, it } from "vitest";
import { can } from "../src/lib/staff-permissions";

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