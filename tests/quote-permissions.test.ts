import { describe, expect, it } from "vitest";
import { can, capabilityForManagePath } from "../src/lib/staff-permissions";

describe("wholesale quote permissions", () => {
  it("allows manager and higher roles to manage quotes", () => {
    expect(can("manager", "quotes")).toBe(true);
    expect(can("owner", "quotes")).toBe(true);
    expect(can("super_admin", "quotes")).toBe(true);
  });
  it("blocks staff and online sales from quote pricing", () => {
    expect(can("staff", "quotes")).toBe(false);
    expect(can("online_sales", "quotes")).toBe(false);
  });
  it("protects the quotes route with its dedicated capability", () => {
    expect(capabilityForManagePath("/manage/quotes")).toBe("quotes");
  });
});