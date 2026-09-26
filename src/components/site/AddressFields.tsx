import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CustomerAddressInput = {
  name: string;
  phone: string;
  alternatePhone: string;
  line1: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
};

export const EMPTY_ADDRESS: CustomerAddressInput = {
  name: "",
  phone: "",
  alternatePhone: "",
  line1: "",
  landmark: "",
  city: "",
  state: "West Bengal",
  pincode: "",
};

export function validateCustomerAddress(address: CustomerAddressInput): string | null {
  if (!address.name.trim() || !/^[6-9]\d{9}$/.test(address.phone.trim()) || !address.line1.trim() || !/^\d{6}$/.test(address.pincode.trim())) {
    return "Please add name, a valid 10-digit phone, address and a 6-digit PIN code";
  }
  if (address.alternatePhone && !/^[6-9]\d{9}$/.test(address.alternatePhone)) {
    return "Enter a valid 10-digit alternate mobile number.";
  }
  if (!address.city.trim() || !address.state.trim()) return "Please add city and state";
  return null;
}

export function AddressFields({ value, onChange }: { value: CustomerAddressInput; onChange: (address: CustomerAddressInput) => void }) {
  const prefix = useId();
  const field = (key: keyof CustomerAddressInput, label: string, numeric = false, optional = false) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`${prefix}-${key}`} className="text-xs">{label}{optional ? " (optional)" : ""}</Label>
      <Input
        id={`${prefix}-${key}`}
        inputMode={numeric ? "numeric" : undefined}
        maxLength={numeric ? (key === "pincode" ? 6 : 10) : undefined}
        value={value[key]}
        onChange={(event) => onChange({
          ...value,
          [key]: numeric ? event.target.value.replace(/\D/g, "").slice(0, key === "pincode" ? 6 : 10) : event.target.value,
        })}
      />
    </div>
  );

  return (
    <div className="grid gap-3">
      {field("name", "Full name")}
      <div className="grid gap-3 sm:grid-cols-2">
        {field("phone", "Phone number", true)}
        {field("alternatePhone", "Alternate Number", true, true)}
      </div>
      {field("line1", "House no., street, area")}
      <div className="grid gap-3 sm:grid-cols-2">
        {field("landmark", "Landmark", false, true)}
        {field("city", "City / town")}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("state", "State")}
        {field("pincode", "PIN code", true)}
      </div>
    </div>
  );
}