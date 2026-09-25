import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const KEY = "shaw-ev-cookie-consent";
const EVENT = "shaw-ev-cookie-consent-change";

export type ConsentChoice = "accepted" | "rejected" | null;

export function readConsent(): ConsentChoice {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "accepted" || v === "rejected" ? v : null;
}

export function setConsent(choice: Exclude<ConsentChoice, null>) {
  window.localStorage.setItem(KEY, choice);
  window.dispatchEvent(new Event(EVENT));
}

/** Re-opens the banner so a visitor can change their mind. */
export function reopenConsent() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function useConsent(): ConsentChoice {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setChoice(readConsent());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return ready ? choice : null;
}

/**
 * Cookie banner. Nothing beyond the essential cookies runs until the visitor
 * accepts — analytics is mounted by <AnalyticsGate /> only after consent.
 */
export function CookieConsent() {
  const [hydrated, setHydrated] = useState(false);
  const choice = useConsent();
  useEffect(() => setHydrated(true), []);
  if (!hydrated || choice) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 p-2 lg:bottom-0 lg:p-3">
      <div className="pointer-events-auto mx-auto grid max-w-3xl gap-2 rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-card)] sm:flex sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Essential cookies keep you signed in and remember your cart. Allow anonymous shop analytics?{" "}
          <Link to="/privacy" className="font-medium text-foreground underline underline-offset-2">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => setConsent("rejected")}>
            Essential only
          </Button>
          <Button size="sm" onClick={() => setConsent("accepted")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Mounts analytics only once the visitor has accepted. */
export function AnalyticsGate() {
  const choice = useConsent();
  const id = import.meta.env['VITE_GA_MEASUREMENT_ID'] as string | undefined;

  useEffect(() => {
    if (choice !== "accepted" || !id) return;
    if (document.getElementById("ga-src")) return;
    const s = document.createElement("script");
    s.id = "ga-src";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    const inline = document.createElement("script");
    inline.id = "ga-init";
    inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});`;
    document.head.appendChild(inline);
  }, [choice, id]);

  return null;
}
