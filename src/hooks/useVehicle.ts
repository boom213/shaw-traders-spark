import { useCallback, useEffect, useState } from "react";

export type Vehicle = { brand: string; model: string };

const KEY = "shaw-ev-vehicle";
const EVENT = "shaw-ev-vehicle-change";

export function clearSavedVehicle() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function readVehicle(): Vehicle | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Vehicle;
    return v?.model ? v : null;
  } catch {
    return null;
  }
}

/** Remembers the shopper's vehicle so "fits your vehicle" works across pages. */
export function useVehicle() {
  const [vehicle, setState] = useState<Vehicle | null>(null);

  useEffect(() => {
    setState(readVehicle());
    const sync = () => setState(readVehicle());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setVehicle = useCallback((next: Vehicle | null) => {
    if (typeof window === "undefined") return;
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else clearSavedVehicle();
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { vehicle, setVehicle };
}
