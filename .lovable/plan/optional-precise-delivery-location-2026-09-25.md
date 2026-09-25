# Optional precise delivery location

## Goal
Let customers optionally mark their exact delivery location on a map during checkout, while keeping the existing manual address form fully usable.

## What will change
- Add an optional **Choose location on map** action beneath the checkout address fields.
- Open a map where customers can use their current location, tap the map, or drag a pin to the precise delivery point.
- Show a compact selected-location confirmation with options to adjust or remove the pin.
- Store latitude and longitude inside the order's existing address snapshot; no map selection will be required to continue.
- Show staff a **View delivery pin** link when an order contains coordinates.
- Keep all existing address validation, delivery, and payment behavior unchanged.

## Technical details
- Load Google Maps asynchronously with the connected browser key, tracking channel, callback, and POI clicks disabled.
- Keep the map renderer client-only and clean up map listeners when the picker closes.
- Validate coordinates in both the browser and checkout server function before storing them.
- Do not call Places, autocomplete, geocoding, or another paid server API; the feature only needs map rendering and browser geolocation.
- Add focused tests for valid, absent, and invalid coordinates, then verify map selection and ordinary manual checkout on desktop and mobile.

## Production requirement
The connected managed Google Maps key works on the Lovable preview but not on `shawtradersev.info`. Before publishing this feature on the custom domain, create a Google Maps API key with billing and Maps JavaScript API enabled, allowing both `https://shawtradersev.info/*` and `https://*.shawtradersev.info/*`, then connect it as **New connection → Use your own credentials**.
