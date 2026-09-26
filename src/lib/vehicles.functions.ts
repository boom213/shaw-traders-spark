import { createServerFn } from "@tanstack/react-start";
import { VEHICLE_SELECT, mapVehicle } from "@/lib/vehicle-map";
import type { VehicleModel } from "@/lib/vehicles";

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const phone10 = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);
const numOrNull = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));
const dateOrNull = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null);

function todayInKolkata(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** Every scooter model on sale, newest first. */
export const listVehicles = createServerFn({ method: "GET" }).handler(async (): Promise<VehicleModel[]> => {
  const { publicClient } = await import("@/lib/supabase-public.server");
  const { data } = await publicClient()
    .from("products")
    .select(VEHICLE_SELECT)
    .eq("product_kind", "vehicle")
    .eq("status", "visible")
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? []).map((r) => mapVehicle(r as Record<string, unknown>));
});

/** One model, with the others shown for comparison. */
export const getVehicle = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => ({ slug: text(data?.slug, 160) }))
  .handler(async ({ data }): Promise<{ vehicle: VehicleModel; others: VehicleModel[] } | null> => {
    const { publicClient } = await import("@/lib/supabase-public.server");
    const sb = publicClient();
    const { data: row } = await sb
      .from("products")
      .select(VEHICLE_SELECT)
      .eq("slug", data.slug)
      .eq("product_kind", "vehicle")
      .eq("status", "visible")
      .maybeSingle();
    if (!row) return null;
    const vehicle = mapVehicle(row as Record<string, unknown>);

    const { data: rest } = await sb
      .from("products")
      .select(VEHICLE_SELECT)
      .eq("product_kind", "vehicle")
      .eq("status", "visible")
      .neq("id", vehicle.id)
      .limit(6);
    return { vehicle, others: (rest ?? []).map((r) => mapVehicle(r as Record<string, unknown>)) };
  });

/** Side-by-side comparison of two or three models. */
export const compareVehicles = createServerFn({ method: "POST" })
  .inputValidator((data: { slugs: string[] }) => ({
    slugs: (Array.isArray(data?.slugs) ? data.slugs : []).map((s) => text(s, 160)).filter(Boolean).slice(0, 4),
  }))
  .handler(async ({ data }): Promise<VehicleModel[]> => {
    if (data.slugs.length === 0) return [];
    const { publicClient } = await import("@/lib/supabase-public.server");
    const { data: rows } = await publicClient()
      .from("products")
      .select(VEHICLE_SELECT)
      .eq("product_kind", "vehicle")
      .eq("status", "visible")
      .in("slug", data.slugs);
    const mapped = (rows ?? []).map((r) => mapVehicle(r as Record<string, unknown>));
    return data.slugs.map((s) => mapped.find((m) => m.slug === s)).filter((v): v is VehicleModel => Boolean(v));
  });

async function productIdForSlug(slug: string): Promise<string | null> {
  const { publicClient } = await import("@/lib/supabase-public.server");
  const { data } = await publicClient()
    .from("products")
    .select("id")
    .eq("slug", slug)
    .eq("product_kind", "vehicle")
    .maybeSingle();
  return data?.id ?? null;
}

/** Book a test ride on a date and slot. */
export const requestTestRide = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; name: string; phone: string; alternatePhone?: string; date: string; slot: string; note?: string }) => ({
    slug: text(data?.slug, 160),
    name: text(data?.name, 120),
    phone: phone10(data?.phone),
    alternatePhone: phone10(data?.alternatePhone),
    date: dateOrNull(data?.date),
    slot: text(data?.slot, 40),
    note: text(data?.note, 400),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!data.name || data.phone.length !== 10) return { ok: false, error: "Please give your name and a 10-digit mobile number." };
    if (data.alternatePhone && !/^[6-9]\d{9}$/.test(data.alternatePhone)) return { ok: false, error: "Enter a valid 10-digit alternate mobile number." };
    if (data.date && data.date < todayInKolkata()) return { ok: false, error: "Please choose today or a future date." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const productId = await productIdForSlug(data.slug);
    const { error } = await supabaseAdmin.from("test_ride_requests").insert({
      product_id: productId,
      name: data.name,
      phone: data.phone,
      alternate_phone: data.alternatePhone || null,
      preferred_date: data.date,
      slot: data.slot || null,
      note: data.note || null,
    } as never);
    if (error) return { ok: false, error: "Could not send your request. Please try again." };
    const { notifyOwnerLead } = await import("@/lib/vehicle-notify.server");
    await notifyOwnerLead("test ride request", [`${data.name} · ${data.phone}${data.alternatePhone ? ` · Alt: ${data.alternatePhone}` : ""}`, `${data.slug}`, `${data.date ?? "any day"} ${data.slot}`]);
    return { ok: true };
  });

/** Ask about finance on a model. */
export const requestFinance = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; name: string; phone: string; alternatePhone?: string; downPayment?: number; tenureMonths?: number; monthlyIncome?: number; employment?: string }) => ({
    slug: text(data?.slug, 160),
    name: text(data?.name, 120),
    phone: phone10(data?.phone),
    alternatePhone: phone10(data?.alternatePhone),
    downPayment: numOrNull(data?.downPayment),
    tenureMonths: numOrNull(data?.tenureMonths),
    monthlyIncome: numOrNull(data?.monthlyIncome),
    employment: text(data?.employment, 60),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!data.name || data.phone.length !== 10) return { ok: false, error: "Please give your name and a 10-digit mobile number." };
    if (data.alternatePhone && !/^[6-9]\d{9}$/.test(data.alternatePhone)) return { ok: false, error: "Enter a valid 10-digit alternate mobile number." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const productId = await productIdForSlug(data.slug);
    const { error } = await supabaseAdmin.from("finance_enquiries").insert({
      product_id: productId,
      name: data.name,
      phone: data.phone,
      alternate_phone: data.alternatePhone || null,
      down_payment: data.downPayment,
      tenure_months: data.tenureMonths,
      monthly_income: data.monthlyIncome,
      employment: data.employment || null,
    } as never);
    if (error) return { ok: false, error: "Could not send your enquiry. Please try again." };
    const { notifyOwnerLead } = await import("@/lib/vehicle-notify.server");
    await notifyOwnerLead("finance enquiry", [`${data.name} · ${data.phone}${data.alternatePhone ? ` · Alt: ${data.alternatePhone}` : ""}`, data.slug, `Down payment ${data.downPayment ?? "-"}, ${data.tenureMonths ?? "-"} months`]);
    return { ok: true };
  });

/** Ask what the old scooter is worth against a new one. */
export const requestExchange = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; name: string; phone: string; brand?: string; model?: string; year?: number; km?: number; condition?: string; photoUrl?: string }) => ({
    slug: text(data?.slug, 160),
    name: text(data?.name, 120),
    phone: phone10(data?.phone),
    brand: text(data?.brand, 60),
    model: text(data?.model, 80),
    year: numOrNull(data?.year),
    km: numOrNull(data?.km),
    condition: text(data?.condition, 40),
    photoUrl: text(data?.photoUrl, 400),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!data.name || data.phone.length !== 10) return { ok: false, error: "Please give your name and a 10-digit mobile number." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const productId = await productIdForSlug(data.slug);
    const { error } = await supabaseAdmin.from("exchange_valuations").insert({
      product_id: productId,
      name: data.name,
      phone: data.phone,
      current_brand: data.brand || null,
      current_model: data.model || null,
      year: data.year,
      km_run: data.km,
      condition: data.condition || null,
      photo_url: data.photoUrl || null,
    } as never);
    if (error) return { ok: false, error: "Could not send your request. Please try again." };
    const { notifyOwnerLead } = await import("@/lib/vehicle-notify.server");
    await notifyOwnerLead("exchange valuation", [`${data.name} · ${data.phone}`, `${data.brand} ${data.model} ${data.year ?? ""}`, `${data.km ?? "-"} km`]);
    return { ok: true };
  });

/** Book a service slot. */
export const requestService = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; phone: string; alternatePhone?: string; date: string; slot: string; issue?: string; registrationNumber?: string }) => ({
    name: text(data?.name, 120),
    phone: phone10(data?.phone),
    alternatePhone: phone10(data?.alternatePhone),
    date: dateOrNull(data?.date),
    slot: text(data?.slot, 40),
    issue: text(data?.issue, 600),
    registrationNumber: text(data?.registrationNumber, 40),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!data.name || data.phone.length !== 10) return { ok: false, error: "Please give your name and a 10-digit mobile number." };
    if (data.alternatePhone && !/^[6-9]\d{9}$/.test(data.alternatePhone)) return { ok: false, error: "Enter a valid 10-digit alternate mobile number." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let registrationId: string | null = null;
    let productId: string | null = null;
    const { data: reg } = await supabaseAdmin
      .from("vehicle_registrations")
      .select("id, product_id")
      .eq("phone", data.phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reg) {
      registrationId = reg.id;
      productId = reg.product_id;
    }

    const { error } = await supabaseAdmin.from("service_bookings").insert({
      registration_id: registrationId,
      product_id: productId,
      name: data.name,
      phone: data.phone,
      alternate_phone: data.alternatePhone || null,
      preferred_date: data.date,
      slot: data.slot || null,
      issue: [data.registrationNumber ? `Reg ${data.registrationNumber}` : "", data.issue].filter(Boolean).join(" — ") || null,
    } as never);
    if (error) return { ok: false, error: "Could not book the slot. Please try again." };
    const { notifyOwnerLead } = await import("@/lib/vehicle-notify.server");
    await notifyOwnerLead("service booking", [`${data.name} · ${data.phone}${data.alternatePhone ? ` · Alt: ${data.alternatePhone}` : ""}`, `${data.date ?? "any day"} ${data.slot}`, data.issue]);
    return { ok: true };
  });

export type ServiceHistoryView = {
  model: string;
  registrationNumber: string | null;
  chassisNumber: string | null;
  warrantyStart: string | null;
  upcoming: { label: string; dueOn: string; dueKm: number | null }[];
  history: { performedOn: string; workDone: string; odometer: number | null; cost: number | null }[];
};

/**
 * Service history for one vehicle. The caller must know both the phone number
 * and the registration or chassis number, so this is never a phone-only lookup.
 */
export const serviceHistory = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string; reference: string }) => ({
    phone: phone10(data?.phone),
    reference: text(data?.reference, 40).toUpperCase(),
  }))
  .handler(async ({ data }): Promise<ServiceHistoryView | { error: string }> => {
    if (data.phone.length !== 10 || data.reference.length < 4) {
      return { error: "Enter the mobile number used at the shop and your registration or chassis number." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("vehicle_registrations")
      .select("id, chassis_number, registration_number, warranty_start, products(name)")
      .eq("phone", data.phone)
      .limit(10);

    const match = (rows ?? []).find(
      (r) =>
        String(r.registration_number ?? "").toUpperCase().replace(/\s/g, "") === data.reference.replace(/\s/g, "") ||
        String(r.chassis_number ?? "").toUpperCase().endsWith(data.reference),
    );
    if (!match) return { error: "We could not find that vehicle. Please check the numbers, or call the shop." };

    const [{ data: due }, { data: records }] = await Promise.all([
      supabaseAdmin.from("service_schedule").select("label, due_on, due_km").eq("registration_id", match.id).eq("status", "due").order("due_on"),
      supabaseAdmin.from("service_records").select("performed_on, work_done, odometer, cost").eq("registration_id", match.id).order("performed_on", { ascending: false }),
    ]);

    return {
      model: (match as { products?: { name?: string } | null }).products?.name ?? "Your scooter",
      registrationNumber: match.registration_number,
      chassisNumber: match.chassis_number ? `••••${String(match.chassis_number).slice(-4)}` : null,
      warrantyStart: match.warranty_start,
      upcoming: (due ?? []).map((d) => ({ label: d.label, dueOn: d.due_on, dueKm: d.due_km })),
      history: (records ?? []).map((r) => ({
        performedOn: r.performed_on,
        workDone: r.work_done,
        odometer: r.odometer,
        cost: r.cost === null ? null : Number(r.cost),
      })),
    };
  });
