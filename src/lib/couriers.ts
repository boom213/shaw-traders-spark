export type Courier = {
  id: string;
  name: string;
  trackingUrlTemplate?: string;
};

/**
 * Courier URL formats can change. Verify templates against each courier's live
 * tracking page before adding or changing one; omit uncertain formats.
 */
export const COURIERS: readonly Courier[] = [
  { id: "delhivery", name: "Delhivery", trackingUrlTemplate: "https://www.delhivery.com/tracking?uniqueIdentifier={awb}" },
  { id: "dtdc", name: "DTDC" },
  { id: "blue-dart", name: "Blue Dart", trackingUrlTemplate: "https://www.bluedart.com/web/guest/trackdartresult?awb={awb}&trackFor=awb" },
  { id: "xpressbees", name: "Xpressbees", trackingUrlTemplate: "https://www.xpressbees.com/track?awb={awb}" },
  { id: "ekart", name: "Ekart", trackingUrlTemplate: "https://ekartlogistics.com/shipmenttrack/{awb}" },
  { id: "india-post", name: "India Post / Speed Post" },
  { id: "trackon", name: "Trackon" },
  { id: "professional-couriers", name: "Professional Couriers" },
  { id: "shiprocket", name: "Shiprocket" },
  { id: "gati", name: "Gati" },
  { id: "safexpress", name: "Safexpress" },
  { id: "vrl-logistics", name: "VRL Logistics" },
  { id: "tci-express", name: "TCI Express", trackingUrlTemplate: "https://www.tciexpress.in/trackingdocket.aspx?dwb=dwb&trackshipment={awb}" },
  { id: "local-transport", name: "Local transport" },
] as const;

const normalized = (value: string) => value.trim().toLocaleLowerCase("en-IN");

export function courierByName(courierName: string): Courier | undefined {
  const name = normalized(courierName);
  return COURIERS.find((courier) => normalized(courier.name) === name);
}

export function trackingUrlFor(courierName: string, awb: string): string | null {
  const courier = courierByName(courierName);
  const trackingNumber = awb.trim();
  if (!courier?.trackingUrlTemplate || !trackingNumber) return null;
  return courier.trackingUrlTemplate.replace("{awb}", encodeURIComponent(trackingNumber));
}

export function resolvedTrackingUrl(courierName: string, awb: string, suppliedUrl?: string): string | null {
  const manualUrl = suppliedUrl?.trim();
  return manualUrl || trackingUrlFor(courierName, awb);
}