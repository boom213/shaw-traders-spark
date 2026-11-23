import { describe, expect, it } from "vitest";
import { DUPLICATE_NAME_MESSAGE, productNameKey, productSaveError } from "../src/lib/product-duplicates";

describe("two products cannot share a name", () => {
  it("treats names differing only in case, spaces or punctuation as the same", () => {
    expect(productNameKey("EV Scooter Wire Projector Light")).toBe(productNameKey("ev scooter – wire  projector-light!"));
  });

  it("keeps genuinely different names apart", () => {
    expect(productNameKey("Activa Head Visor – Blue")).not.toBe(productNameKey("Activa Head Visor – Red"));
  });

  it("tells staff the name is taken when the database blocks a duplicate name", () => {
    const error = { code: "23505", message: 'duplicate key value violates unique constraint "products_name_key_unique"' };
    expect(productSaveError(error, "That SKU is already in use.")).toBe(DUPLICATE_NAME_MESSAGE);
  });

  it("keeps the SKU message for other duplicate values", () => {
    const error = { code: "23505", message: 'duplicate key value violates unique constraint "products_sku_key"' };
    expect(productSaveError(error, "That SKU is already in use.")).toBe("That SKU is already in use.");
  });
});
