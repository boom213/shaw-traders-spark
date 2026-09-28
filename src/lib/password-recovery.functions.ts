import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RECOVERY_WINDOW_MS = 15 * 60 * 1000;

export const hasRecentPasswordRecovery = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error || !data.user?.recovery_sent_at) return false;

    const recoverySentAt = Date.parse(data.user.recovery_sent_at);
    return Number.isFinite(recoverySentAt) && Date.now() - recoverySentAt < RECOVERY_WINDOW_MS;
  });