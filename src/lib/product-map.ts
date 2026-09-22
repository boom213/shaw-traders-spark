import type { Product } from "@/lib/catalog";

export const PRODUCT_SELECT =
  "id, sku, slug, name, subcategory, brand, model, price, mrp, stock, description, specs, voltage, ah, wattage, warranty, weight, dimensions, shipping_info, created_at, categories!inner(slug, name), product_images(url, sort_order), product_compatibility(vehicle_model)";

type Row = Record<string, any>;

export function mapProduct(row: Row): Product {
  const images = ((row['product_images'] ?? []) as Row[])
    .slice()
    .sort((a, b) => (a['sort_order'] ?? 0) - (b['sort_order'] ?? 0))
    .map((i) => String(i['url']))
    .filter(Boolean);

  const compatibility = ((row['product_compatibility'] ?? []) as Row[])
    .map((c) => String(c['vehicle_model']))
    .filter(Boolean);

  const cat = row['categories'] as Row | null;

  return {
    id: String(row['id']),
    sku: String(row['sku'] ?? ""),
    name: String(row['name']),
    slug: String(row['slug']),
    category: String(cat?.['slug'] ?? ""),
    ...(cat?.['name'] ? { categoryName: String(cat['name']) } : {}),
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
    createdAt: String(row['created_at']),
  };
}
