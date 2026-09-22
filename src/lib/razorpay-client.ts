export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void; on: (event: string, cb: (e: unknown) => void) => void };
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Load the Razorpay checkout script once. */
export function loadRazorpay(): Promise<RazorpayCtor | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const existing = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve((window as unknown as { Razorpay?: RazorpayCtor }).Razorpay ?? null);
    script.onerror = () => resolve(null);
    document.body.appendChild(script);
  });
}

/** Open the payment sheet and resolve with the outcome. */
export async function payWithRazorpay(options: {
  keyId: string;
  orderId: string;
  amountPaise: number;
  name: string;
  description: string;
  prefill: { name: string; contact: string; email?: string };
}): Promise<{ status: "success"; payload: RazorpaySuccess } | { status: "dismissed" } | { status: "failed"; message: string }> {
  const Razorpay = await loadRazorpay();
  if (!Razorpay) return { status: "failed", message: "Could not load the payment window. Check your internet connection." };

  return new Promise((resolve) => {
    let settled = false;
    const done = (r: Awaited<ReturnType<typeof payWithRazorpay>>) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };

    const rzp = new Razorpay({
      key: options.keyId,
      order_id: options.orderId,
      amount: options.amountPaise,
      currency: "INR",
      name: options.name,
      description: options.description,
      prefill: options.prefill,
      theme: { color: "#16a34a" },
      modal: { ondismiss: () => done({ status: "dismissed" }) },
      handler: (payload: RazorpaySuccess) => done({ status: "success", payload }),
    } as Record<string, unknown>);

    rzp.on("payment.failed", (e: unknown) => {
      const description = (e as { error?: { description?: string } })?.error?.description;
      done({ status: "failed", message: description ?? "The payment did not go through." });
    });

    rzp.open();
  });
}
