import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Upload one identity document to the private trade-docs bucket.
 * Returns the storage path, which only staff can open through a signed link.
 */
export async function uploadTradeDoc(userId: string, field: string, file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error("That file is larger than 8 MB. Please send a smaller photo or PDF.");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `${userId}/${field}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("trade-docs").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}
