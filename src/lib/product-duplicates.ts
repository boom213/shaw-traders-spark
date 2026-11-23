/**
 * Product names are unique ignoring case, spaces and punctuation
 * (database index `products_name_key_unique`). Keep this key identical to it.
 */
export const productNameKey = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const DUPLICATE_NAME_MESSAGE = "A product with this name already exists. Use a different name.";

type DbError = { code?: string; message?: string; details?: string } | null | undefined;

/** Turns a failed product save into a message staff can act on. */
export function productSaveError(error: DbError, otherDuplicate: string): string {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`;
  if (text.includes("products_name_key_unique")) return DUPLICATE_NAME_MESSAGE;
  if (error?.code === "23505") return otherDuplicate;
  return error?.message || "Could not save this product.";
}
