import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_THUMBNAIL_SIZES, productThumbnailStoragePath } from "@/lib/product-photo";

const MAX_SIDE = 1400;

/** Shrink a camera photo and turn it into a small WebP before it leaves the phone. */
export async function toWebp(file: File, maxSide = MAX_SIDE, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read this photo");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob) throw new Error("Could not prepare this photo");
  return blob;
}

async function productPhotoVariants(file: File) {
  const bitmap = await createImageBitmap(file);
  const render = async (maxSide: number, quality: number) => {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not read this photo");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) throw new Error("Could not prepare this photo");
    return blob;
  };
  try {
    return await Promise.all([
      render(MAX_SIDE, 0.82),
      render(PRODUCT_THUMBNAIL_SIZES.compact, 0.8),
      render(PRODUCT_THUMBNAIL_SIZES.card, 0.84),
    ]);
  } finally {
    bitmap.close?.();
  }
}

/** Upload one photo for a product and return the link to store against it. */
export async function uploadProductPhoto(productId: string, file: File): Promise<string> {
  const [blob, compactThumbnail, cardThumbnail] = await productPhotoVariants(file);
  const name = `${productId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-photos").upload(name, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const thumbnailResults = await Promise.all([
    supabase.storage.from("product-photos").upload(productThumbnailStoragePath(name, "compact"), compactThumbnail, { contentType: "image/webp", cacheControl: "31536000", upsert: false }),
    supabase.storage.from("product-photos").upload(productThumbnailStoragePath(name, "card"), cardThumbnail, { contentType: "image/webp", cacheControl: "31536000", upsert: false }),
  ]);
  const thumbnailErrors = thumbnailResults.map((result) => result.error?.message).filter(Boolean);
  if (thumbnailErrors.length) console.warn("Product photo uploaded without every thumbnail", thumbnailErrors.join("; "));
  return `/api/public/photo/${name}`;
}

/** Upload a photo a customer attached to their review. */
export async function uploadReviewPhoto(productId: string, file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to add review photos");
  const blob = await toWebp(file);
  const name = `${user.id}/${productId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("review-photos").upload(name, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return `/api/public/photo/review-photos/${name}`;
}

/** Upload a home-page banner photo and return the link to store against the slide. */
export async function uploadHeroPhoto(file: File): Promise<string> {
  const blob = await toWebp(file);
  const name = `hero/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-photos").upload(name, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return `/api/public/photo/${name}`;
}

/** Upload an About-page gallery photo and return the link to store against it. */
export async function uploadAboutPhoto(file: File): Promise<string> {
  const blob = await toWebp(file);
  const name = `about/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from("product-photos").upload(name, blob, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return `/api/public/photo/${name}`;
}
