import { EMPTY_PRICE, EMPTY_SPECS, type VehicleModel, type VehiclePrice, type VehicleSpecs } from "@/lib/vehicles";

/**
 * Columns read for every customer-facing vehicle view.
 * rack_location is deliberately absent, exactly as for parts.
 */
export const VEHICLE_SELECT =
  "id, slug, name, brand, description, specs, stock, status, product_kind, created_at, product_images(url, sort_order), vehicle_specs(*), vehicle_pricing(*)";

type Row = Record<string, any>;

const one = (v: unknown): Row | null => (Array.isArray(v) ? ((v[0] as Row) ?? null) : ((v as Row) ?? null));

export function mapSpecs(row: Row | null): VehicleSpecs {
  if (!row) return { ...EMPTY_SPECS };
  return {
    variant: row['variant'] ?? null,
    colours: Array.isArray(row['colours']) ? (row['colours'] as string[]) : [],
    batteryType: row['battery_type'] ?? null,
    batteryCapacity: row['battery_capacity'] ?? null,
    certifiedRange: row['certified_range'] ?? null,
    topSpeed: row['top_speed'] ?? null,
    chargingTime: row['charging_time'] ?? null,
    motorPower: row['motor_power'] ?? null,
    kerbWeight: row['kerb_weight'] ?? null,
    warrantyYears: row['warranty_years'] === null || row['warranty_years'] === undefined ? null : Number(row['warranty_years']),
    warrantyKm: row['warranty_km'] === null || row['warranty_km'] === undefined ? null : Number(row['warranty_km']),
    registrationRequired: row['registration_required'] !== false,
    serviceIntervalMonths: Number(row['service_interval_months'] ?? 6),
    serviceIntervalKm: Number(row['service_interval_km'] ?? 3000),
  };
}

export function mapPrice(row: Row | null): VehiclePrice {
  if (!row) return { ...EMPTY_PRICE };
  const p = {
    exShowroom: Number(row['ex_showroom'] ?? 0),
    rto: Number(row['rto'] ?? 0),
    insurance: Number(row['insurance'] ?? 0),
    accessories: Number(row['accessories'] ?? 0),
    subsidy: Number(row['subsidy'] ?? 0),
    tokenAmount: Number(row['token_amount'] ?? 0),
  };
  return { ...p, onRoad: Number(row['on_road'] ?? p.exShowroom + p.rto + p.insurance + p.accessories - p.subsidy) };
}

export function mapVehicle(row: Row): VehicleModel {
  const images = ((row['product_images'] ?? []) as Row[])
    .slice()
    .sort((a, b) => (a['sort_order'] ?? 0) - (b['sort_order'] ?? 0))
    .map((i) => String(i['url']))
    .filter(Boolean);

  return {
    id: String(row['id']),
    slug: String(row['slug']),
    name: String(row['name']),
    brand: row['brand'] ?? null,
    description: row['description'] ?? null,
    images,
    stock: Number(row['stock'] ?? 0),
    specs: mapSpecs(one(row['vehicle_specs'])),
    price: mapPrice(one(row['vehicle_pricing'])),
    extraSpecs: (row['specs'] ?? {}) as Record<string, string>,
    createdAt: String(row['created_at']),
  };
}
