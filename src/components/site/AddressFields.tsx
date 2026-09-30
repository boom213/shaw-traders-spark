import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldErrors } from "@/lib/form-validation";

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

export type CustomerAddressErrors = FieldErrors<keyof CustomerAddressInput>;

export function validateCustomerAddress(address: CustomerAddressInput): CustomerAddressErrors {
  const errors: CustomerAddressErrors = {};
  if (!address.name.trim()) errors.name = "Enter the recipient's full name.";
  if (!/^[6-9]\d{9}$/.test(address.phone.trim())) errors.phone = "Enter a valid 10-digit mobile number.";
  if (address.alternatePhone && !/^[6-9]\d{9}$/.test(address.alternatePhone.trim())) errors.alternatePhone = "Enter a valid 10-digit alternate mobile number.";
  if (!address.line1.trim()) errors.line1 = "Enter the house number, street, and area.";
  if (!address.city.trim()) errors.city = "Enter the city or town.";
  if (!address.state.trim()) errors.state = "Enter the state.";
  if (!/^\d{6}$/.test(address.pincode.trim())) errors.pincode = "PIN code must be 6 digits.";
  return errors;
}

export function AddressFields({ value, onChange, errors = {} }: { value: CustomerAddressInput; onChange: (address: CustomerAddressInput) => void; errors?: CustomerAddressErrors }) {
  const prefix = useId();
  const field = (key: keyof CustomerAddressInput, label: string, numeric = false, optional = false) => {
    const inputId = `${prefix}-${key}`;
    const errorId = `${inputId}-error`;
    const error = errors[key];
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={inputId} className="text-xs">{label}{optional ? " (optional)" : ""}</Label>
        <Input
          id={inputId}
          inputMode={numeric ? "numeric" : undefined}
          maxLength={numeric ? (key === "pincode" ? 6 : 10) : undefined}
          value={value[key]}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange({
            ...value,
            [key]: numeric ? event.target.value.replace(/\D/g, "").slice(0, key === "pincode" ? 6 : 10) : event.target.value,
          })}
        />
        {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    );
  };

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