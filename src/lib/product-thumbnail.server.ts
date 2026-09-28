import { PRODUCT_THUMBNAIL_MAX_SIDE, originalPathFromThumbnail, productThumbnailStoragePath } from "@/lib/product-photo";

type ThumbnailPayload = { bytes: Uint8Array; type: string };

function detectType(bytes: Uint8Array, suppliedType = "") {
  const type = suppliedType.toLowerCase();
  if (type.includes("png") || (bytes[0] === 0x89 && bytes[1] === 0x50)) return "png";
  if (type.includes("webp") || (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45)) return "webp";
  return "";
}

function resizeRgba(source: Uint8Array, sourceWidth: number, sourceHeight: number) {
  const scale = Math.min(1, PRODUCT_THUMBNAIL_MAX_SIDE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  if (width === sourceWidth && height === sourceHeight) return { data: source, width, height };
  const output = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y + 0.5) * sourceHeight / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x + 0.5) * sourceWidth / width));
      const from = (sourceY * sourceWidth + sourceX) * 4;
      const to = (y * width + x) * 4;
      output[to] = source[from] ?? 0;
      output[to + 1] = source[from + 1] ?? 0;
      output[to + 2] = source[from + 2] ?? 0;
      output[to + 3] = source[from + 3] ?? 255;
    }
  }
  return { data: output, width, height };
}

async function createPngThumbnail(bytes: Uint8Array, suppliedType: string): Promise<Uint8Array | null> {
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
    const UPNG = await import("upng-js");
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
  const resized = resizeRgba(rgba, width, height);
  const { encode } = await import("upng-js");
  const buffer = resized.data.buffer.slice(resized.data.byteOffset, resized.data.byteOffset + resized.data.byteLength) as ArrayBuffer;
  return new Uint8Array(encode([buffer], resized.width, resized.height, 0));
}

export async function loadOrCreateProductThumbnail(thumbnailPath: string): Promise<ThumbnailPayload | null> {
  const originalPath = originalPathFromThumbnail(thumbnailPath);
  if (!originalPath || !originalPath.length || originalPath.includes("..")) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bucket = supabaseAdmin.storage.from("product-photos");
  const existing = await bucket.download(productThumbnailStoragePath(originalPath));
  if (existing.data) return { bytes: new Uint8Array(await existing.data.arrayBuffer()), type: existing.data.type || "image/webp" };

  const original = await bucket.download(originalPath);
  if (!original.data) return null;
  const originalBytes = new Uint8Array(await original.data.arrayBuffer());
  try {
    const thumbnail = await createPngThumbnail(originalBytes, original.data.type);
    if (!thumbnail) return { bytes: originalBytes, type: original.data.type };
    await bucket.upload(productThumbnailStoragePath(originalPath), thumbnail, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });
    return { bytes: thumbnail, type: "image/png" };
  } catch {
    return { bytes: originalBytes, type: original.data.type };
  }
}