import { describe, expect, it } from "vitest";
import { courierByName, trackingUrlFor } from "@/lib/couriers";

describe("courier tracking links", () => {
  it("matches courier names without case or surrounding-space sensitivity", () => {
    expect(courierByName("  dElHiVeRy ")?.id).toBe("delhivery");
  });

  it("generates a direct link and URL-encodes the AWB", () => {
    expect(trackingUrlFor("Delhivery", " AB 12/3 ")).toBe(
      "https://www.delhivery.com/tracking?uniqueIdentifier=AB%2012%2F3",
    );
  });

  it("returns no link for carriers without a verified direct template", () => {
    expect(trackingUrlFor("Safexpress", "12345678")).toBeNull();
    expect(trackingUrlFor("India Post / Speed Post", "EE123456789IN")).toBeNull();
  });

  it("returns no link for unknown couriers or blank AWBs", () => {
    expect(trackingUrlFor("Other Courier", "ABC123")).toBeNull();
    expect(trackingUrlFor("Blue Dart", "  ")).toBeNull();
  });
});