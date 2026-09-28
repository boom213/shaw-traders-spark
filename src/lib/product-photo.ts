const PUBLIC_PHOTO_PREFIX = "/api/public/photo/";
const THUMBNAIL_PREFIX = "__thumbs__/v2/";

export const PRODUCT_THUMBNAIL_SIZES = { compact: 192, card: 480 } as const;
export type ProductThumbnailVariant = keyof typeof PRODUCT_THUMBNAIL_SIZES;

export function productPhotoStoragePath(source: string) {
  if (!source.startsWith(PUBLIC_PHOTO_PREFIX)) return null;
  const path = source.slice(PUBLIC_PHOTO_PREFIX.length).split("?", 1)[0]?.replace(/^\/+/, "") ?? "";
  if (!path || path.includes("..") || path.startsWith("review-photos/")) return null;
  return path;
}

export function productThumbnailStoragePath(path: string, variant: ProductThumbnailVariant = "compact") {
  const clean = path.replace(/^\/+/, "");
  return clean.startsWith(THUMBNAIL_PREFIX) ? clean : `${THUMBNAIL_PREFIX}${variant}/${clean}`;
}

export function productThumbnailUrl(source: string | null | undefined, variant: ProductThumbnailVariant = "compact") {
  if (!source) return null;
  const path = productPhotoStoragePath(source);
  return path ? `${PUBLIC_PHOTO_PREFIX}${productThumbnailStoragePath(path, variant)}` : source;
}

export function originalPathFromThumbnail(path: string) {
  const match = /^__thumbs__\/v2\/(compact|card)\/(.+)$/.exec(path);
  return match?.[2] ?? null;
}

export function thumbnailVariantFromPath(path: string): ProductThumbnailVariant | null {
  const match = /^__thumbs__\/v2\/(compact|card)\//.exec(path);
  return (match?.[1] as ProductThumbnailVariant | undefined) ?? null;
}