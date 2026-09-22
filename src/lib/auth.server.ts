import { getRequestHeader } from "@tanstack/react-start/server";
import { publicClient } from "@/lib/supabase-public.server";

/** Signed-in customer id for this request, or null for a guest. */
export async function currentUserId(): Promise<string | null> {
  const header = getRequestHeader("authorization");
  const token = header?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data } = await publicClient().auth.getUser(token);
  return data.user?.id ?? null;
}
