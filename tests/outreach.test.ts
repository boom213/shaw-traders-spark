import { describe, expect, it } from "vitest";
import { parseOutreachCsv } from "../src/lib/outreach.server";
import { buildOutreachWhatsAppUrl } from "../src/lib/outreach.functions";
import { can, capabilityForManagePath } from "../src/lib/staff-permissions";

describe("staff outreach", () => {
  it("imports valid rows, rejects a bad phone, and skips a normalized duplicate", () => {
    const result = parseOutreachCsv(`name,phone,message,link\nA,9876543210,Hello A,https://shawtradersev.com/product/a\nB,123,Bad number,\nC,+91 98765 43210,Duplicate,\nD,09876543211,Hello D,\nE,919876543212,Hello E,`);
    expect(result.error).toBeUndefined();
    expect(result.contacts).toHaveLength(3);
    expect(result.rejected).toEqual([{ row: 3, reason: "Invalid phone number" }]);
    expect(result.duplicatesSkipped).toBe(1);
  });

  it("accepts case-insensitive headers in any order and validates links", () => {
    const result = parseOutreachCsv("MESSAGE,LINK,PHONE,NAME\nHello,ftp://example.com,9876543210,A");
    expect(result.contacts).toHaveLength(0);
    expect(result.rejected[0]).toEqual({ row: 2, reason: "Link must be a valid http or https URL" });
  });

  it("caps uploads at 5,000 rows", () => {
    const rows = Array.from({ length: 5001 }, (_, index) => `Name ${index},98765${String(index).padStart(5, "0").slice(-5)},Hello`).join("\n");
    expect(parseOutreachCsv(`name,phone,message\n${rows}`).error).toContain("5,000");
  });

  it("builds an encoded WhatsApp handoff with a link on its own line", () => {
    const url = buildOutreachWhatsAppUrl("919876543210", "Hello A", "https://shawtradersev.com/product/a");
    expect(url).toBe(`https://wa.me/919876543210?text=${encodeURIComponent("Hello A\n\nhttps://shawtradersev.com/product/a")}`);
  });

  it("allows Staff and above but not Online Sales", () => {
    expect(capabilityForManagePath("/manage/outreach")).toBe("operations");
    expect(can("staff", "operations")).toBe(true);
    expect(can("online_sales", "operations")).toBe(false);
  });
});