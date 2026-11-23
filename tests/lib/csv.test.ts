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
describe("CSV formula neutralizing", () => {
  it("prefixes a customer name that starts with = so spreadsheets show it as text", () => {
    expect(csvCell('=HYPERLINK("http://x","click")')).toBe('"\'=HYPERLINK(""http://x"",""click"")"');
  });

  it("prefixes text starting with +, -, @, tab or carriage return", () => {
    expect(csvCell("+cmd|' /C calc'!A0")).toBe(`"'+cmd|' /C calc'!A0"`);
    expect(csvCell("-2+3")).toBe(`"'-2+3"`);
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("\t=1")).toBe(`"'\t=1"`);
    expect(csvCell("\r=1")).toBe(`"'\r=1"`);
  });

  it("leaves negative amounts and phone numbers with a country code unchanged", () => {
    expect(csvCell(-500)).toBe('"-500"');
    expect(csvCell("-500.25")).toBe('"-500.25"');
    expect(csvCell("+919876543210")).toBe('"+919876543210"');
  });
});
