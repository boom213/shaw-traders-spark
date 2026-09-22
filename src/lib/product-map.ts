import type { Product } from "@/lib/catalog";
import { isOrderingMode } from "@/lib/ordering";

/**
 * Columns read for every customer-facing product view.
 * rack_location is deliberately absent — it is shop-floor information and
 * must never reach a customer, an API response, the sitemap or structured data.
 */
export const PRODUCT_SELECT =
  "id, sku, slug, name, subcategory, brand, model, price, mrp, stock, description, specs, voltage, ah, wattage, warranty, weight, dimensions, shipping_info, box_contents, hsn_code, ordering_mode, status, created_at, categories!inner(slug, name, ordering_mode), product_images(url, sort_order), product_compatibility(vehicle_model, year_from, year_to, variant)";

type Row = Record<string, any>;

export function mapProduct(row: Row): Product {
  const images = ((row['product_images'] ?? []) as Row[])
    .slice()
    .sort((a, b) => (a['sort_order'] ?? 0) - (b['sort_order'] ?? 0))
    .map((i) => String(i['url']))
    .filter(Boolean);

  const compatibility = ((row['product_compatibility'] ?? []) as Row[])
    .filter((c) => c['vehicle_model'])
    .map((c) => {
      const extras: string[] = [];
      if (c['variant']) extras.push(String(c['variant']));
      const from = c['year_from'] ? String(c['year_from']) : "";
      const to = c['year_to'] ? String(c['year_to']) : "";
      if (from || to) extras.push(from && to ? `${from}-${to}` : from ? `${from} onwards` : `up to ${to}`);
      return extras.length ? `${String(c['vehicle_model'])} (${extras.join(", ")})` : String(c['vehicle_model']);
    });

  const cat = row['categories'] as Row | null;

  return {
    id: String(row['id']),
    sku: String(row['sku'] ?? ""),
    name: String(row['name']),
    slug: String(row['slug']),
    category: String(cat?.['slug'] ?? ""),
    ...(cat?.['name'] ? { categoryName: String(cat['name']) } : {}),
    ...(isOrderingMode(cat?.['ordering_mode']) ? { categoryOrderingMode: cat!['ordering_mode'] } : {}),
    ...(isOrderingMode(row['ordering_mode']) ? { orderingMode: row['ordering_mode'] } : {}),
    ...(row['subcategory'] ? { subcategory: String(row['subcategory']) } : {}),
    ...(row['brand'] ? { brand: String(row['brand']) } : {}),
    ...(row['model'] ? { model: String(row['model']) } : {}),
    ...(row['price'] !== null && row['price'] !== undefined ? { price: Number(row['price']) } : {}),
    ...(row['mrp'] !== null && row['mrp'] !== undefined ? { mrp: Number(row['mrp']) } : {}),
    stock: Number(row['stock'] ?? 0),
    images,
    ...(row['description'] ? { description: String(row['description']) } : {}),
    specs: (row['specs'] ?? {}) as Record<string, string>,
    ...(row['voltage'] ? { voltage: String(row['voltage']) } : {}),
    ...(row['ah'] ? { ah: String(row['ah']) } : {}),
    ...(row['wattage'] ? { wattage: String(row['wattage']) } : {}),
    compatibility,
    ...(row['warranty'] ? { warranty: String(row['warranty']) } : {}),
    ...(row['weight'] ? { weight: String(row['weight']) } : {}),
    ...(row['dimensions'] ? { dimensions: String(row['dimensions']) } : {}),
    ...(row['shipping_info'] ? { shippingInfo: String(row['shipping_info']) } : {}),
    ...(row['box_contents'] ? { boxContents: String(row['box_contents']) } : {}),
    ...(row['hsn_code'] ? { hsnCode: String(row['hsn_code']) } : {}),
    createdAt: String(row['created_at']),
  };
}
