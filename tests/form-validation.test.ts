import { describe, expect, it } from "vitest";
import { validateCustomerAddress } from "@/components/site/AddressFields";
import { validateNameAndPhones } from "@/lib/form-validation";
import { validateTradeForm } from "@/lib/trade-options";

describe("form validation", () => {
  it("returns every invalid customer address field while optional fields stay optional", () => {
    expect(validateCustomerAddress({ name: "", phone: "", alternatePhone: "", line1: "", landmark: "", city: "", state: "", pincode: "" })).toEqual({
      name: expect.any(String), phone: expect.any(String), line1: expect.any(String), city: expect.any(String), state: expect.any(String), pincode: expect.any(String),
    });
  });

  it("validates name and both phone fields independently", () => {
    expect(validateNameAndPhones({ name: "", phone: "123", alternatePhone: "123" })).toEqual({
      name: expect.any(String), phone: expect.any(String), alternatePhone: expect.any(String),
    });
  });

  it("keeps wholesale years and staff optional", () => {
    expect(validateTradeForm({ businessName: "Shaw Traders", phone: "9876543210", alternatePhone: "", gstin: "", shopAddress: "12 Market Road", businessType: "Retailer", monthlyVolume: "₹1–5 lakh", yearsInBusiness: "", staffCount: "" })).toEqual({});
  });
});