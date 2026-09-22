/**
 * Sends browser crashes to the shop's own error log. Runs once, only in the
 * published app, and never gets in the way of what the customer is doing.
 */
let started = false;

function report(message: string, stack?: string) {
  try {
    const body = JSON.stringify({ message, stack, url: window.location.href });
    void fetch("/api/public/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never throw from the reporter */
  }
}

export function setupErrorReporting() {
  if (started || typeof window === "undefined" || !import.meta.env.PROD) return;
  started = true;

  window.addEventListener("error", (e) => {
    if (!e.message) return;
    report(e.message, e.error instanceof Error ? e.error.stack : undefined);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    report(
      reason instanceof Error ? reason.message : `Unhandled promise rejection: ${String(reason).slice(0, 200)}`,
      reason instanceof Error ? reason.stack : undefined,
    );
  });
}

export const reportError = report;
