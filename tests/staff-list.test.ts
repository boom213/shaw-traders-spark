import { describe, expect, it } from "vitest";
import { prepareStaffPage, type StaffMember } from "@/lib/staff.functions";

const members: StaffMember[] = [
  { profileId: "a", name: "Asha", email: "asha@example.com", role: "staff", since: "2026-01-01", isYou: false, locked: false },
  { profileId: "a", name: "Asha", email: "asha@example.com", role: "owner", since: "2026-02-01", isYou: false, locked: false },
  { profileId: "b", name: "Bimal", email: "bimal@example.com", role: "manager", since: "2026-03-01", isYou: false, locked: false },
];

describe("prepareStaffPage", () => {
  it("deduplicates to the highest role before filtering and pagination", () => {
    const result = prepareStaffPage(members, { q: "", role: "all", sort: "name", page: 0, pageSize: 1 });
    expect(result.total).toBe(2);
    expect(result.items).toEqual([expect.objectContaining({ profileId: "a", role: "owner" })]);
  });

  it("composes name search, role filtering, and sorting", () => {
    const result = prepareStaffPage(members, { q: "bim", role: "manager", sort: "newest", page: 0, pageSize: 8 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.email).toBe("bimal@example.com");
  });
});