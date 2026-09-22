import { getRequestHeader } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StaffRole = "owner" | "manager" | "staff";

export type StaffContext = {
  userId: string;
  email: string;
  name: string;
  role: StaffRole;
};

/** Bearer token attached by the client middleware, if any. */
export function bearerToken(): string | null {
  const header = getRequestHeader("authorization");
  const token = header?.replace(/^Bearer\s+/i, "").trim();
  return token && token.length > 10 ? token : null;
}

/** Resolve the signed-in staff member for this request, or null. */
export async function staffContext(): Promise<StaffContext | null> {
  const token = bearerToken();
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  const user = auth.user;
  if (!user) return null;

  // One person may hold more than one role; this function returns the
  // highest-privilege one, so two rows never lock a staff member out.
  const { data: role } = await supabaseAdmin.rpc("staff_role", { _user_id: user.id });
  if (!role) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    name: profile?.full_name ?? user.email ?? "Staff",
    role: role.role as StaffRole,
  };
}

/** Throws unless the caller is signed in as staff. Optionally require owner. */
export async function requireStaff(opts?: { owner?: boolean }): Promise<StaffContext> {
  const ctx = await staffContext();
  if (!ctx) throw new Error("Staff sign-in required");
  if (opts?.owner && ctx.role !== "owner") throw new Error("Only the owner can do this");
  return ctx;
}

/** Record who changed what, so every price, stock and order edit is traceable. */
export async function logAudit(
  sb: SupabaseClient<never>,
  actor: StaffContext,
  action: string,
  entity: string,
  entityId: string | null,
  diff: Record<string, unknown>,
): Promise<void> {
  await sb.from("audit_log").insert({
    actor: `${actor.name} <${actor.email}> (${actor.role})`,
    action,
    entity,
    entity_id: entityId,
    diff: diff as never,
  } as never);
}
