/**
 * A plain delivery promise by PIN code, based on how far the parcel travels
 * from the counter in Bud Bud, Bardhaman.
 */
export type DeliveryEstimate = {
  ok: boolean;
  label: string;
  detail: string;
};

export function deliveryFor(pincode: string): DeliveryEstimate {
  const pin = pincode.replace(/\D/g, "");
  if (pin.length !== 6) {
    return { ok: false, label: "Enter a 6-digit PIN code", detail: "We will show the delivery days for your area." };
  }

  const local = pin.startsWith("713");
  const westBengal = pin.startsWith("7");
  const east = /^(7|8)/.test(pin);

  if (local) return { ok: true, label: "1–2 working days", detail: "Local area — pickup at our counter is also possible today." };
  if (westBengal) return { ok: true, label: "2–3 working days", detail: "Within West Bengal." };
  if (east) return { ok: true, label: "3–5 working days", detail: "Eastern India." };
  return { ok: true, label: "5–7 working days", detail: "Rest of India. Heavy items may take a little longer." };
}
