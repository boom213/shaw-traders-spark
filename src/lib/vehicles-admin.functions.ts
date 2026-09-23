import { createServerFn } from "@tanstack/react-start";
import { mapPrice, mapSpecs } from "@/lib/vehicle-map";
import type { VehiclePrice, VehicleSpecs } from "@/lib/vehicles";

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));
const money = (v: unknown) => Math.max(0, Number(v ?? 0) || 0);
const dateOrNull = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : null);
const uuid = (v: unknown) => (/^[0-9a-f-]{36}$/i.test(String(v ?? "")) ? String(v) : null);

const BOOKING_STATUSES = ["booked", "allotted", "rto_in_progress", "ready_for_delivery", "delivered", "cancelled"];

export type AdminVehicleRow = {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  description: string | null;
  status: string;
  stock: number;
  isDemo: boolean;
  images: string[];
  specs: VehicleSpecs;
  price: VehiclePrice;
};

/** Every scooter model the shop lists, including drafts and hidden ones. */
export const listVehiclesAdmin = createServerFn({ method: "POST" }).handler(async (): Promise<AdminVehicleRow[]> => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("products")
    .select("id, slug, name, brand, status, stock, product_images(url, sort_order), vehicle_specs(*), vehicle_pricing(*)")
    .eq("product_kind", "vehicle")
    .order("name")
    .limit(200);

  const one = (v: unknown) => (Array.isArray(v) ? ((v[0] as Record<string, any>) ?? null) : ((v as Record<string, any>) ?? null));
  return (data ?? []).map((r) => ({
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    brand: r.brand,
    status: String(r.status),
    stock: Number(r.stock ?? 0),
    images: ((r.product_images ?? []) as { url: string; sort_order: number }[])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => i.url),
    specs: mapSpecs(one(r.vehicle_specs)),
    price: mapPrice(one(r.vehicle_pricing)),
  }));
});

export type SaveVehicleInput = {
  id?: string;
  name: string;
  slug?: string;
  brand?: string;
  description?: string;
  status?: string;
  stock?: number;
  specs: Partial<VehicleSpecs> & { coloursText?: string };
  price: Partial<VehiclePrice>;
};

/** Create or update a scooter model with its specification sheet and price. */
export const saveVehicle = createServerFn({ method: "POST" })
  .inputValidator((data: SaveVehicleInput) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const staff = await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { slugify } = await import("@/lib/catalog");

    const name = text(data?.name, 160);
    if (!name) return { ok: false, error: "Give the model a name." };
    const status = ["draft", "visible", "hidden"].includes(String(data?.status)) ? String(data?.status) : "draft";

    let id = uuid(data?.id);
    if (!id) {
      const slug = slugify(text(data?.slug, 160) || name);
      const { data: created, error } = await supabaseAdmin
        .from("products")
        .insert({
          sku: `EV-${slug.toUpperCase().slice(0, 18)}`,
          slug,
          name,
          brand: text(data?.brand, 80) || null,
          description: text(data?.description, 4000) || null,
          product_kind: "vehicle",
          status,
          stock: Math.max(0, Number(data?.stock ?? 0) || 0),
          specs: {},
        } as never)
        .select("id")
        .single();
      if (error || !created) return { ok: false, error: error?.message ?? "Could not save this model." };
      id = created.id;
    } else {
      await supabaseAdmin
        .from("products")
        .update({
          name,
          brand: text(data?.brand, 80) || null,
          description: text(data?.description, 4000) || null,
          status: status as never,
          stock: Math.max(0, Number(data?.stock ?? 0) || 0),
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", id);
    }

    const colours = String(data?.specs?.coloursText ?? (data?.specs?.colours ?? []).join(", "))
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 12);

    await supabaseAdmin.from("vehicle_specs").upsert({
      product_id: id,
      variant: text(data?.specs?.variant, 80) || null,
      colours,
      battery_type: text(data?.specs?.batteryType, 80) || null,
      battery_capacity: text(data?.specs?.batteryCapacity, 80) || null,
      certified_range: text(data?.specs?.certifiedRange, 80) || null,
      top_speed: text(data?.specs?.topSpeed, 80) || null,
      charging_time: text(data?.specs?.chargingTime, 80) || null,
      motor_power: text(data?.specs?.motorPower, 80) || null,
      kerb_weight: text(data?.specs?.kerbWeight, 80) || null,
      warranty_years: num(data?.specs?.warrantyYears),
      warranty_km: num(data?.specs?.warrantyKm),
      registration_required: data?.specs?.registrationRequired !== false,
      service_interval_months: Math.max(1, Number(data?.specs?.serviceIntervalMonths ?? 6) || 6),
      service_interval_km: Math.max(100, Number(data?.specs?.serviceIntervalKm ?? 3000) || 3000),
      updated_at: new Date().toISOString(),
    } as never);

    await supabaseAdmin.from("vehicle_pricing").upsert({
      product_id: id,
      ex_showroom: money(data?.price?.exShowroom),
      rto: money(data?.price?.rto),
      insurance: money(data?.price?.insurance),
      accessories: money(data?.price?.accessories),
      subsidy: money(data?.price?.subsidy),
      token_amount: money(data?.price?.tokenAmount),
      updated_at: new Date().toISOString(),
    } as never);

    await logAudit(supabaseAdmin as never, staff, "vehicle.save", "products", id, { name, status });
    return { ok: true, id: id! };
  });

/** Attach a photo to a model. */
export const addVehiclePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: string; url: string }) => ({ productId: uuid(data?.productId), url: text(data?.url, 400) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    if (!data.productId || !data.url) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("product_images")
      .select("id", { count: "exact", head: true })
      .eq("product_id", data.productId);
    await supabaseAdmin.from("product_images").insert({ product_id: data.productId, url: data.url, sort_order: count ?? 0 } as never);
    return { ok: true };
  });

export type BookingRow = {
  id: string;
  humanId: string;
  modelName: string;
  customerName: string;
  phone: string;
  colour: string | null;
  status: string;
  paymentStatus: string;
  onRoadTotal: number;
  tokenAmount: number;
  balanceDue: number;
  expectedDelivery: string | null;
  createdAt: string;
  registrationId: string | null;
  chassisNumber: string | null;
  motorNumber: string | null;
  registrationNumber: string | null;
  warrantyStart: string | null;
};

/** The booking pipeline. */
export const listBookings = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string } | undefined) => ({ status: text(data?.status, 30) || "open" }))
  .handler(async ({ data }): Promise<BookingRow[]> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("vehicle_bookings")
      .select("*, products(name), vehicle_registrations(id, chassis_number, motor_number, registration_number, warranty_start)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status === "open") query = query.not("status", "in", "(delivered,cancelled)");
    else if (BOOKING_STATUSES.includes(data.status)) query = query.eq("status", data.status as never);

    const { data: rows } = await query;
    return (rows ?? []).map((r) => {
      const reg = (Array.isArray(r.vehicle_registrations) ? r.vehicle_registrations[0] : r.vehicle_registrations) as
        | Record<string, any>
        | null;
      return {
        id: String(r.id),
        humanId: String(r.human_id),
        modelName: (r as { products?: { name?: string } | null }).products?.name ?? "",
        customerName: String(r.customer_name),
        phone: String(r.phone),
        colour: r.colour,
        status: String(r.status),
        paymentStatus: String(r.payment_status),
        onRoadTotal: Number(r.on_road_total ?? 0),
        tokenAmount: Number(r.token_amount ?? 0),
        balanceDue: Number(r.balance_due ?? 0),
        expectedDelivery: r.expected_delivery,
        createdAt: String(r.created_at),
        registrationId: reg ? String(reg['id']) : null,
        chassisNumber: reg?.['chassis_number'] ?? null,
        motorNumber: reg?.['motor_number'] ?? null,
        registrationNumber: reg?.['registration_number'] ?? null,
        warrantyStart: reg?.['warranty_start'] ?? null,
      };
    });
  });

/** Move a booking along its track and tell the customer. */
export const setBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { bookingId: string; status: string; note?: string; expectedDelivery?: string }) => ({
    bookingId: uuid(data?.bookingId),
    status: BOOKING_STATUSES.includes(String(data?.status)) ? String(data?.status) : "",
    note: text(data?.note, 300),
    expectedDelivery: dateOrNull(data?.expectedDelivery),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const staff = await requireStaff();
    if (!data.bookingId || !data.status) return { ok: false, error: "Pick a stage." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin
      .from("vehicle_bookings")
      .update({
        status: data.status as never,
        ...(data.expectedDelivery ? { expected_delivery: data.expectedDelivery } : {}),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.bookingId);
    await supabaseAdmin
      .from("booking_events")
      .insert({ booking_id: data.bookingId, status: data.status as never, note: data.note || null, created_by: staff.name } as never);
    await logAudit(supabaseAdmin as never, staff, "booking.status", "vehicle_bookings", data.bookingId, { status: data.status });

    const { notifyBookingStatus } = await import("@/lib/vehicle-notify.server");
    await notifyBookingStatus(data.bookingId, data.status, data.note || null);
    return { ok: true };
  });

/** Record the machine handed over, start the warranty and build the service plan. */
export const recordDelivery = createServerFn({ method: "POST" })
  .inputValidator((data: { bookingId: string; chassisNumber: string; motorNumber: string; registrationNumber?: string; warrantyStart?: string; deliveredOn?: string }) => ({
    bookingId: uuid(data?.bookingId),
    chassisNumber: text(data?.chassisNumber, 60),
    motorNumber: text(data?.motorNumber, 60),
    registrationNumber: text(data?.registrationNumber, 40),
    warrantyStart: dateOrNull(data?.warrantyStart),
    deliveredOn: dateOrNull(data?.deliveredOn),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const staff = await requireStaff();
    if (!data.bookingId) return { ok: false, error: "Unknown booking." };
    if (!data.chassisNumber || !data.motorNumber) return { ok: false, error: "Chassis and motor number are both needed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking } = await supabaseAdmin
      .from("vehicle_bookings")
      .select("id, product_id, profile_id, customer_name, phone")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { ok: false, error: "Unknown booking." };

    const today = new Date().toISOString().slice(0, 10);
    const { data: reg, error } = await supabaseAdmin
      .from("vehicle_registrations")
      .upsert(
        {
          booking_id: booking.id,
          product_id: booking.product_id,
          profile_id: booking.profile_id,
          owner_name: booking.customer_name,
          phone: booking.phone,
          chassis_number: data.chassisNumber,
          motor_number: data.motorNumber,
          registration_number: data.registrationNumber || null,
          warranty_start: data.warrantyStart ?? today,
          delivered_on: data.deliveredOn ?? today,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "booking_id" },
      )
      .select("id")
      .single();
    if (error || !reg) return { ok: false, error: error?.message ?? "Could not save these numbers." };

    await supabaseAdmin.rpc("build_service_schedule", { p_registration: reg.id });
    await supabaseAdmin
      .from("vehicle_bookings")
      .update({ status: "delivered" as never, updated_at: new Date().toISOString() } as never)
      .eq("id", booking.id);
    await supabaseAdmin
      .from("booking_events")
      .insert({ booking_id: booking.id, status: "delivered" as never, note: "Vehicle handed over", created_by: staff.name } as never);
    await logAudit(supabaseAdmin as never, staff, "booking.delivered", "vehicle_registrations", reg.id, {
      chassis: data.chassisNumber,
    });

    const { notifyBookingStatus } = await import("@/lib/vehicle-notify.server");
    await notifyBookingStatus(booking.id, "delivered", "Your warranty starts today. Service reminders will come on WhatsApp.");
    return { ok: true };
  });

export type LeadRow = {
  id: string;
  kind: string;
  name: string;
  phone: string;
  model: string | null;
  detail: string;
  status: string;
  createdAt: string;
};

/** Test rides, finance enquiries, exchange valuations and service bookings in one queue. */
export const listLeads = createServerFn({ method: "POST" })
  .inputValidator((data: { kind?: string } | undefined) => ({ kind: text(data?.kind, 20) || "test_ride" }))
  .handler(async ({ data }): Promise<LeadRow[]> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sel = "*, products(name)";
    const model = (r: Record<string, any>) => (r['products'] as { name?: string } | null)?.name ?? null;

    if (data.kind === "finance") {
      const { data: rows } = await supabaseAdmin.from("finance_enquiries").select(sel).order("created_at", { ascending: false }).limit(200);
      return (rows ?? []).map((r) => ({
        id: String(r.id),
        kind: "finance",
        name: String(r.name),
        phone: String(r.phone),
        model: model(r as Record<string, any>),
        detail: `Down payment ₹${r.down_payment ?? "-"} · ${r.tenure_months ?? "-"} months · income ₹${r.monthly_income ?? "-"} · ${r.employment ?? ""}`,
        status: String(r.status),
        createdAt: String(r.created_at),
      }));
    }
    if (data.kind === "exchange") {
      const { data: rows } = await supabaseAdmin.from("exchange_valuations").select(sel).order("created_at", { ascending: false }).limit(200);
      return (rows ?? []).map((r) => ({
        id: String(r.id),
        kind: "exchange",
        name: String(r.name),
        phone: String(r.phone),
        model: model(r as Record<string, any>),
        detail: `${r.current_brand ?? ""} ${r.current_model ?? ""} ${r.year ?? ""} · ${r.km_run ?? "-"} km · ${r.condition ?? ""}${r.quoted_value ? ` · quoted ₹${r.quoted_value}` : ""}`,
        status: String(r.status),
        createdAt: String(r.created_at),
      }));
    }
    if (data.kind === "service") {
      const { data: rows } = await supabaseAdmin.from("service_bookings").select(sel).order("created_at", { ascending: false }).limit(200);
      return (rows ?? []).map((r) => ({
        id: String(r.id),
        kind: "service",
        name: String(r.name),
        phone: String(r.phone),
        model: model(r as Record<string, any>),
        detail: `${r.preferred_date ?? "any day"} ${r.slot ?? ""} — ${r.issue ?? ""}`,
        status: String(r.status),
        createdAt: String(r.created_at),
      }));
    }

    const { data: rows } = await supabaseAdmin.from("test_ride_requests").select(sel).order("created_at", { ascending: false }).limit(200);
    return (rows ?? []).map((r) => ({
      id: String(r.id),
      kind: "test_ride",
      name: String(r.name),
      phone: String(r.phone),
      model: model(r as Record<string, any>),
      detail: `${r.preferred_date ?? "any day"} ${r.slot ?? ""}${r.note ? ` — ${r.note}` : ""}`,
      status: String(r.status),
      createdAt: String(r.created_at),
    }));
  });

const LEAD_TABLES: Record<string, string> = {
  test_ride: "test_ride_requests",
  finance: "finance_enquiries",
  exchange: "exchange_valuations",
  service: "service_bookings",
};

/** Mark a lead done, or note what was agreed. */
export const updateLead = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: string; id: string; status?: string; note?: string; quotedValue?: number }) => ({
    kind: text(data?.kind, 20),
    id: uuid(data?.id),
    status: text(data?.status, 20),
    note: text(data?.note, 500),
    quotedValue: num(data?.quotedValue),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const staff = await requireStaff();
    const table = LEAD_TABLES[data.kind];
    if (!table || !data.id) return { ok: false, error: "Unknown request." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from(table as never)
      .update({
        ...(data.status ? { status: data.status } : {}),
        ...(data.note ? { note: data.note } : {}),
        ...(data.kind === "exchange" && data.quotedValue !== null ? { quoted_value: data.quotedValue } : {}),
        handled_by: staff.name,
      } as never)
      .eq("id", data.id);
    await logAudit(supabaseAdmin as never, staff, `${data.kind}.update`, table, data.id, { status: data.status });
    return { ok: true };
  });

export type ServiceDueRow = {
  id: string;
  registrationId: string;
  label: string;
  dueOn: string;
  owner: string;
  phone: string;
  model: string | null;
  registrationNumber: string | null;
};

/** Services falling due, soonest first. */
export const listServiceDue = createServerFn({ method: "POST" }).handler(async (): Promise<ServiceDueRow[]> => {
  const { requireStaff } = await import("@/lib/staff.server");
  await requireStaff();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("service_schedule")
    .select("id, label, due_on, registration_id, vehicle_registrations(owner_name, phone, registration_number, products(name))")
    .eq("status", "due")
    .order("due_on")
    .limit(100);
  return (rows ?? []).map((r) => {
    const reg = (r as { vehicle_registrations?: Record<string, any> | null }).vehicle_registrations;
    return {
      id: String(r.id),
      registrationId: String(r.registration_id),
      label: String(r.label),
      dueOn: String(r.due_on),
      owner: String(reg?.['owner_name'] ?? ""),
      phone: String(reg?.['phone'] ?? ""),
      model: (reg?.['products'] as { name?: string } | null)?.name ?? null,
      registrationNumber: reg?.['registration_number'] ?? null,
    };
  });
});

/** Write up a service that was carried out. */
export const addServiceRecord = createServerFn({ method: "POST" })
  .inputValidator((data: { registrationId: string; scheduleId?: string; workDone: string; odometer?: number; cost?: number; nextDueOn?: string }) => ({
    registrationId: uuid(data?.registrationId),
    scheduleId: uuid(data?.scheduleId),
    workDone: text(data?.workDone, 1000),
    odometer: num(data?.odometer),
    cost: num(data?.cost),
    nextDueOn: dateOrNull(data?.nextDueOn),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { requireStaff, logAudit } = await import("@/lib/staff.server");
    const staff = await requireStaff();
    if (!data.registrationId || !data.workDone) return { ok: false, error: "Say what work was done." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("service_records").insert({
      registration_id: data.registrationId,
      work_done: data.workDone,
      odometer: data.odometer,
      cost: data.cost,
      next_due_on: data.nextDueOn,
      created_by: staff.name,
    } as never);
    if (data.scheduleId) {
      await supabaseAdmin
        .from("service_schedule")
        .update({ status: "done", completed_at: new Date().toISOString() } as never)
        .eq("id", data.scheduleId);
    }
    await logAudit(supabaseAdmin as never, staff, "service.record", "service_records", data.registrationId, {});
    return { ok: true };
  });
