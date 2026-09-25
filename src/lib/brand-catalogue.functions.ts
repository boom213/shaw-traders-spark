import { createServerFn } from "@tanstack/react-start";

export const CATALOGUE_PATH = "catalogue/st-catalogue.pdf";

/** Super admin only: a one-time upload link for the ST catalogue PDF. */
export const catalogueUploadUrl = createServerFn({ method: "POST" }).handler(async () => {
  const { requireStaff, logAudit } = await import("@/lib/staff.server");
  const actor = await requireStaff({ superAdmin: true });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.storage.from("product-photos").remove([CATALOGUE_PATH]);
  const { data, error } = await supabaseAdmin.storage.from("product-photos").createSignedUploadUrl(CATALOGUE_PATH);
  if (error || !data) throw new Error(error?.message ?? "Could not prepare upload");
  await logAudit(supabaseAdmin as never, actor, "catalogue.upload", "brand_catalogue", null, {});
  return { path: data.path, token: data.token };
});

/** When the current catalogue was uploaded, if any. */
export const catalogueInfo = createServerFn({ method: "POST" }).handler(async () => {
  const { requireStaff } = await import("@/lib/staff.server");
  const ctx = await requireStaff({ capability: "settings" });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from("product-photos").list("catalogue");
  const f = data?.find((x) => `catalogue/${x.name}` === CATALOGUE_PATH);
  return {
    superAdmin: ctx.role === "super_admin",
    uploadedAt: f?.updated_at ?? f?.created_at ?? null,
    size: (f?.metadata as { size?: number } | undefined)?.size ?? null,
  };
});
