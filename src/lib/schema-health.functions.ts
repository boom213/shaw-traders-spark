import { createServerFn } from "@tanstack/react-start";

const REQUIRED_SCHEMA_OBJECTS = [
  "profiles.business_name",
  "orders.needs_payment_review",
  "counter_sale_payments.status",
  "counter_sale_payments.voided_at",
  "suppliers",
  "supplier_ledger",
  "qr_vendors",
  "vendor_payments",
];

export const schemaHealth = createServerFn({ method: "POST" })
  .inputValidator((data: undefined) => data)
  .handler(async (): Promise<string[]> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff({ capability: "settings" });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("schema_health", {
      p_objects: REQUIRED_SCHEMA_OBJECTS,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).filter((item) => !item.present).map((item) => item.object);
  });