import { PRODUCT_THUMBNAIL_SIZES, originalPathFromThumbnail, productThumbnailStoragePath, thumbnailVariantFromPath } from "@/lib/product-photo";

type ThumbnailPayload = { bytes: Uint8Array; type: string };
type UpngModule = typeof import("upng-js");

async function loadUpng(): Promise<UpngModule> {
  const module = await import("upng-js");
  return ((module as unknown as { default?: UpngModule }).default ?? module) as UpngModule;
}

function detectType(bytes: Uint8Array, suppliedType = "") {
  const type = suppliedType.toLowerCase();
  if (type.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50)) return "png";
  if (type.includes("webp") || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45)) return "webp";
  return "";
}

function resizeRgba(source: Uint8Array, sourceWidth: number, sourceHeight: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  if (width === sourceWidth && height === sourceHeight) return { data: source, width, height };
  const output = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.max(0, Math.min(sourceHeight - 1, (y + 0.5) / scale - 0.5));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(sourceHeight - 1, y0 + 1);
    const yWeight = sourceY - y0;
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.max(0, Math.min(sourceWidth - 1, (x + 0.5) / scale - 0.5));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(sourceWidth - 1, x0 + 1);
      const xWeight = sourceX - x0;
      const to = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const topLeft = source[(y0 * sourceWidth + x0) * 4 + channel] ?? (channel === 3 ? 255 : 0);
        const topRight = source[(y0 * sourceWidth + x1) * 4 + channel] ?? topLeft;
        const bottomLeft = source[(y1 * sourceWidth + x0) * 4 + channel] ?? topLeft;
        const bottomRight = source[(y1 * sourceWidth + x1) * 4 + channel] ?? topRight;
        const top = topLeft + (topRight - topLeft) * xWeight;
        const bottom = bottomLeft + (bottomRight - bottomLeft) * xWeight;
        output[to + channel] = Math.round(top + (bottom - top) * yWeight);
      }
    }
  }
  return { data: output, width, height };
}

async function createPngThumbnail(bytes: Uint8Array, suppliedType: string, maxSide: number): Promise<Uint8Array | null> {
  const type = detectType(bytes, suppliedType);
  let rgba: Uint8Array;
  let width: number;
  let height: number;
  if (type === "webp") {
    const { decode } = await import("@stacksjs/ts-webp");
    const decoded = decode(bytes);
    rgba = decoded.data;
    width = decoded.width;
    height = decoded.height;
  } else if (type === "png") {
    const UPNG = await loadUpng();
    const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const decoded = UPNG.decode(input);
    const frame = UPNG.toRGBA8(decoded)[0];
    if (!frame) return null;
    rgba = new Uint8Array(frame);
    width = decoded.width;
    height = decoded.height;
  } else {
    return null;
  }
  const resized = resizeRgba(rgba, width, height, maxSide);
  const { encode } = await loadUpng();
  const buffer = resized.data.buffer.slice(resized.data.byteOffset, resized.data.byteOffset + resized.data.byteLength) as ArrayBuffer;
  return new Uint8Array(encode([buffer], resized.width, resized.height, 0));
}

export async function loadOrCreateProductThumbnail(thumbnailPath: string): Promise<ThumbnailPayload | null> {
  const originalPath = originalPathFromThumbnail(thumbnailPath);
  const variant = thumbnailVariantFromPath(thumbnailPath);
  if (!originalPath || !variant || !originalPath.length || originalPath.includes("..")) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bucket = supabaseAdmin.storage.from("product-photos");
  const existing = await bucket.download(productThumbnailStoragePath(originalPath, variant));
  if (existing.data) return { bytes: new Uint8Array(await existing.data.arrayBuffer()), type: existing.data.type || "image/webp" };

  const original = await bucket.download(originalPath);
  if (!original.data) return null;
  const originalBytes = new Uint8Array(await original.data.arrayBuffer());
  try {
    const thumbnail = await createPngThumbnail(originalBytes, original.data.type, PRODUCT_THUMBNAIL_SIZES[variant]);
    if (!thumbnail) return { bytes: originalBytes, type: original.data.type };
    await bucket.upload(productThumbnailStoragePath(originalPath, variant), thumbnail, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });
    return { bytes: thumbnail, type: "image/png" };
  } catch {
    return { bytes: originalBytes, type: original.data.type };
  }
}