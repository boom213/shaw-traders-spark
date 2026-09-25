import { createServerFn } from "@tanstack/react-start";

/** Returns only the referrer-restricted browser settings intended for map rendering. */
export const getGoogleMapsBrowserConfig = createServerFn({ method: "GET" }).handler(async () => ({
  key: process.env['GOOGLE_MAPS_BROWSER_KEY'] ?? "",
  channel: process.env['GOOGLE_MAPS_TRACKING_ID'] ?? "shaw-checkout",
}));