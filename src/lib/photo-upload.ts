import { supabase } from "@/integrations/supabase/client";

const MAX_SIDE = 1400;

/** Shrink a camera photo and turn it into a small WebP before it leaves the phone. */
export async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read this photo");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
  if (!blob) throw new Error("Could not prepare this photo");
  return blob;
}

/** Upload one photo for a product and return the link to store against it. */
export async function uploadProductPhoto(productId: string, file: File): Promise<string> {
  const blob = await toWebp(file);
  const name = `${productId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-photos").upload(name, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return `/api/public/photo/${name}`;
}

/** Upload a photo a customer attached to their review. */
export async function uploadReviewPhoto(productId: string, file: File): Promise<string> {
  const blob = await toWebp(file);
  const name = `${productId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("review-photos").upload(name, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return `/api/public/photo/review-photos/${name}`;
}
