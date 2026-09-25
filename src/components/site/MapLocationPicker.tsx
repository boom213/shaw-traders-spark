import { Crosshair, MapPin, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type DeliveryCoordinates = { latitude: number; longitude: number };

type MapInstance = {
  setCenter: (point: DeliveryCoordinates) => void;
  setZoom: (zoom: number) => void;
  addListener: (event: string, handler: (event: { latLng?: { lat: () => number; lng: () => number } }) => void) => { remove: () => void };
};

type MarkerInstance = {
  setPosition: (point: DeliveryCoordinates) => void;
  addListener: (event: string, handler: () => void) => { remove: () => void };
  getPosition: () => { lat: () => number; lng: () => number } | null;
  setMap: (map: null) => void;
};

type MapsApi = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
};

declare global {
  interface Window {
    google?: { maps: MapsApi };
    initShawDeliveryMap?: () => void;
  }
}

let mapsPromise: Promise<MapsApi> | null = null;

function loadMaps(): Promise<MapsApi> {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;

  const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'];
  const channel = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'];
  if (!key) return Promise.reject(new Error("Google Maps is not configured"));

  mapsPromise = new Promise((resolve, reject) => {
    window.initShawDeliveryMap = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error("Google Maps did not load"));
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=initShawDeliveryMap&channel=${encodeURIComponent(channel ?? "shaw-checkout")}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps could not load"));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

const DEFAULT_POINT: DeliveryCoordinates = { latitude: 23.406, longitude: 87.914 };

export function MapLocationPicker({
  open,
  value,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  value?: DeliveryCoordinates;
  onOpenChange: (open: boolean) => void;
  onConfirm: (coordinates: DeliveryCoordinates) => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markerRef = useRef<MarkerInstance | null>(null);
  const listenersRef = useRef<{ remove: () => void }[]>([]);
  const [point, setPoint] = useState<DeliveryCoordinates>(value ?? DEFAULT_POINT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !mapElement.current) return;
    let active = true;
    setLoading(true);
    setPoint(value ?? DEFAULT_POINT);

    void loadMaps()
      .then((maps) => {
        if (!active || !mapElement.current) return;
        const initial = value ?? DEFAULT_POINT;
        const map = new maps.Map(mapElement.current, {
          center: initial,
          zoom: value ? 17 : 13,
          clickableIcons: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        const marker = new maps.Marker({ map, position: initial, draggable: true, title: "Delivery location" });
        mapRef.current = map;
        markerRef.current = marker;
        listenersRef.current = [
          map.addListener("click", (event) => {
            const latLng = event.latLng;
            if (!latLng) return;
            const next = { latitude: latLng.lat(), longitude: latLng.lng() };
            marker.setPosition(next);
            setPoint(next);
          }),
          marker.addListener("dragend", () => {
            const position = marker.getPosition();
            if (position) setPoint({ latitude: position.lat(), longitude: position.lng() });
          }),
        ];
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          toast.error("The map is unavailable. You can continue with the written address.");
        }
      });

    return () => {
      active = false;
      listenersRef.current.forEach((listener) => listener.remove());
      listenersRef.current = [];
      markerRef.current?.setMap(null);
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [open, value]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return toast.error("Location access is not available on this device");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        setPoint(next);
        markerRef.current?.setPosition(next);
        mapRef.current?.setCenter(next);
        mapRef.current?.setZoom(18);
      },
      () => toast.error("Location permission was not granted. Tap the map to place the pin."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Mark exact delivery location</DialogTitle>
          <DialogDescription>Tap the map or drag the pin. This is optional and helps the delivery person find you.</DialogDescription>
        </DialogHeader>
        <div className="relative h-[min(56vh,30rem)] min-h-80 overflow-hidden rounded-lg border border-border bg-muted">
          <div ref={mapElement} className="size-full" aria-label="Choose delivery location on map" />
          {loading && <div className="absolute inset-0 grid place-items-center bg-background/80 text-sm text-muted-foreground">Loading map…</div>}
          <Button type="button" size="sm" variant="secondary" className="absolute bottom-3 left-3 shadow-md" onClick={useCurrentLocation}>
            <Crosshair className="size-4" /> Use my location
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Pin: {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</p>
        <DialogFooter className="gap-2 sm:space-x-0">
          {value && (
            <Button type="button" variant="ghost" onClick={() => {
              const next = value;
              setPoint(next);
              markerRef.current?.setPosition(next);
              mapRef.current?.setCenter(next);
            }}>
              <RotateCcw className="size-4" /> Reset
            </Button>
          )}
          <Button type="button" onClick={() => { onConfirm(point); onOpenChange(false); }}>
            <MapPin className="size-4" /> Confirm this location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}