/**
 * Product name for titles and descriptions, with the brand in front only when
 * it adds something: never the shop's own name (the title already ends in
 * "Shaw Traders EV") and never a brand the name already contains.
 */
export function productHeading(brand: string | null | undefined, name: string): string {
  const b = (brand ?? "").trim();
  if (!b) return name;
  if (isShopOwnBrand(b) || name.toLowerCase().includes(b.toLowerCase())) return name;
  return `${b} ${name}`;
}

/** The shop's own "Shaw Traders" brand, which needs no label next to its own name. */
export function isShopOwnBrand(brand: string | null | undefined): boolean {
  return (brand ?? "").trim().toLowerCase().startsWith("shaw traders");
}

/** Category slugs that have at least one visible part, from product rows. */
export function listedCategorySlugs(rows: { categories: { slug: string } | null }[]): Set<string> {
  const slugs = new Set<string>();
  for (const r of rows) if (r.categories?.slug) slugs.add(r.categories.slug);
  return slugs;
}
