/**
 * Generic category photos used only as a visual stand-in until Shaw Traders
 * uploads the real photo of a part. They are never presented as the actual
 * product photo of a specific item.
 */
import phBattery from "@/assets/ph-battery.jpg";
import phBody from "@/assets/ph-body.jpg";
import phCharger from "@/assets/ph-charger.jpg";
import phElectrical from "@/assets/ph-electrical.jpg";
import phLight from "@/assets/ph-light.jpg";
import phMotor from "@/assets/ph-motor.jpg";
import phSuspension from "@/assets/ph-suspension.jpg";
import phWheel from "@/assets/ph-wheel.jpg";
import type { Product } from "@/lib/catalog";

export const CATEGORY_PLACEHOLDER: Record<string, string> = {
  "ev-batteries": phBattery,
  chargers: phCharger,
  motors: phMotor,
  controllers: phMotor,
  "body-parts": phBody,
  "brake-parts": phWheel,
  "wheels-tyres": phWheel,
  suspension: phSuspension,
  lighting: phLight,
  footrests: phSuspension,
  "locks-latches": phElectrical,
  "electrical-parts": phElectrical,
  "cables-wiring": phElectrical,
  accessories: phElectrical,
};

export const placeholderFor = (category: string) => CATEGORY_PLACEHOLDER[category] ?? phElectrical;

/** Real photo when the shop has uploaded one, otherwise a category stand-in. */
export function imageFor(product: Pick<Product, "images" | "category">) {
  return product.images[0] ?? placeholderFor(product.category);
}

export const isPlaceholder = (product: Pick<Product, "images">) => !product.images[0];
