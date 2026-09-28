import { useEffect, useRef, useState } from "react";

export type PaymentConfirmationPhase = "idle" | "checking" | "waiting" | "grace" | "confirmed" | "timeout";

export function usePaymentConfirmation<T>({
  armed,
  check,
  isConfirmed,
  onConfirmed,
  onTimeout,
}: {
  armed: boolean;
  check: () => Promise<T>;
  isConfirmed: (result: T) => boolean;
  onConfirmed: (result: T) => void;
  onTimeout: () => void;
}) {
  const [phase, setPhase] = useState<PaymentConfirmationPhase>("idle");
  const callbacks = useRef({ check, isConfirmed, onConfirmed, onTimeout });
  callbacks.current = { check, isConfirmed, onConfirmed, onTimeout };

  useEffect(() => {
    if (!armed) {
      setPhase("idle");
      return;
    }

    let active = true;
    let settled = false;
    const startedAt = Date.now();
    setPhase("checking");

    const finish = (next: "confirmed" | "timeout", result?: T) => {
      if (!active || settled) return;
      settled = true;
      setPhase(next);
      if (next === "confirmed" && result !== undefined) callbacks.current.onConfirmed(result);
      else callbacks.current.onTimeout();
    };

    const tick = async () => {
      if (!active || settled) return;
      try {
        const result = await callbacks.current.check();
        if (!active || settled) return;
        if (callbacks.current.isConfirmed(result)) return finish("confirmed", result);
      } catch {
        // A transient read failure must not stop reconciliation.
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed >= 90_000) finish("timeout");
      else setPhase(elapsed >= 12_000 ? "grace" : "waiting");
    };

    void tick();
    const interval = window.setInterval(() => void tick(), 3_000);
    const timeout = window.setTimeout(() => finish("timeout"), 90_000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [armed]);

  return { phase };
}