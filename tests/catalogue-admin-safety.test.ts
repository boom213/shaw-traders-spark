import { describe, expect, it } from "vitest";
import { parseCatalogueCsv } from "@/lib/catalogue-admin.functions";

describe("catalogue CSV row references", () => {
  it("derives source rows from physical file order and ignores the exported row value", () => {
    const parsed = parseCatalogueCsv([
      "row,sku,price",
      "99,EV-ONE,1200",
      "",
      "2,EV-TWO,1500",
    ].join("\r\n"));

    expect(parsed.error).toBeUndefined();
    expect(parsed.rows.map((row) => ({ sourceRow: row.sourceRow, sku: row.sku }))).toEqual([
      { sourceRow: 1, sku: "EV-ONE" },
      { sourceRow: 3, sku: "EV-TWO" },
    ]);
  });

  it("accepts a BOM-prefixed exported header", () => {
    const parsed = parseCatalogueCsv("\uFEFFrow,sku,stock\r\n1,EV-ONE,4");
    expect(parsed.rows[0]).toMatchObject({ sourceRow: 1, sku: "EV-ONE", stock: 4 });
  });
});

describe("catalogue safety wiring", () => {
  it("blocks duplicate SKUs in both preview UI and the apply endpoint", async () => {
    const [server, page] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/catalogue-admin.functions.ts", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/routes/manage.import.tsx", "utf8")),
    ]);
    expect(server).toContain("if (res.duplicates.length > 0)");
    expect(server).toContain("Duplicate product codes must be fixed before importing");
    expect(page).toContain("preview.duplicates.length > 0");
    expect(page).toContain("preview.changes.length === 0 || preview.duplicates.length > 0");
  });

  it("requires a second server-confirmed delete when reviews exist", async () => {
    const [server, page] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/lib/catalogue-admin.functions.ts", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/routes/manage.catalogue.tsx", "utf8")),
    ]);
    expect(server).toContain("confirmDeleteReviews?: boolean");
    expect(server).toContain('.from("reviews")');
    expect(page).toContain("Use Hidden instead");
    expect(page).toContain("Delete anyway");
  });

  it("removes missing cart entries while keeping account saved-list entries manually removable", async () => {
    const [cart, account] = await Promise.all([
      import("node:fs/promises").then((fs) => fs.readFile("src/routes/cart.tsx", "utf8")),
      import("node:fs/promises").then((fs) => fs.readFile("src/routes/account.tsx", "utf8")),
    ]);
    expect(cart).toContain("removeUnavailable(unavailable)");
    expect(cart).toContain("unavailable item was");
    expect(account).toContain("UnavailableSavedItem");
    expect(account).toContain("removeSaved(productId)");
  });
});