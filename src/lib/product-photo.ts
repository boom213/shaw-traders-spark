const PUBLIC_PHOTO_PREFIX = "/api/public/photo/";
const THUMBNAIL_PREFIX = "__thumbs__/";

export const PRODUCT_THUMBNAIL_MAX_SIDE = 192;

export function productPhotoStoragePath(source: string) {
  if (!source.startsWith(PUBLIC_PHOTO_PREFIX)) return null;
  const path = source.slice(PUBLIC_PHOTO_PREFIX.length).split("?", 1)[0]?.replace(/^\/+/, "") ?? "";
  if (!path || path.includes("..") || path.startsWith("review-photos/")) return null;
  return path;
}

export function productThumbnailStoragePath(path: string) {
  const clean = path.replace(/^\/+/, "");
  return clean.startsWith(THUMBNAIL_PREFIX) ? clean : `${THUMBNAIL_PREFIX}${clean}`;
}

export function productThumbnailUrl(source: string | null | undefined) {
  if (!source) return null;
  const path = productPhotoStoragePath(source);
  return path ? `${PUBLIC_PHOTO_PREFIX}${productThumbnailStoragePath(path)}` : source;
}

export function originalPathFromThumbnail(path: string) {
  return path.startsWith(THUMBNAIL_PREFIX) ? path.slice(THUMBNAIL_PREFIX.length) : null;
}