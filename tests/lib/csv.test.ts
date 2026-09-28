import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("CSV utilities", () => {
  it("adds a BOM, CRLF rows, and safely quotes spreadsheet values", () => {
    const csv = toCsv(["Name", "Note"], [["बैटरी", 'One, "quoted" line\nnext']]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv).toContain('"बैटरी"');
    expect(csv).toContain('"One, ""quoted"" line\nnext"');
  });

  it("keeps numeric values unmodified inside quoted cells", () => {
    expect(csvCell(1250.5)).toBe('"1250.5"');
  });
});