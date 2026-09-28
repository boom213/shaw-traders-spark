import type { SupabaseClient } from "@supabase/supabase-js";
import type { CsvExportResult } from "@/lib/csv";

export async function csvExportContext() {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff({ capability: "reports" });
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  return { sb, actor, logAudit };
}

export async function auditCsvExport(
  sb: SupabaseClient<never>,
  actor: Awaited<ReturnType<typeof import("@/lib/staff.server")["requireStaff"]>>,
  logAudit: typeof import("@/lib/staff.server")["logAudit"],
  dataset: string,
  result: Pick<CsvExportResult, "rows" | "truncated">,
  filters: Record<string, unknown>,
) {
  await logAudit(sb, actor, `export.${dataset}`, dataset, null, { rows: result.rows, truncated: result.truncated, filters });
}