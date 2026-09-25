import { createServerFn } from "@tanstack/react-start";

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const phone10 = (v: unknown) => String(v ?? "").replace(/\D/g, "").slice(-10);

export type StartBookingResult =
  | { error: string }
  | {
      bookingId: string;
      humanId: string;
      token: string;
      tokenAmount: number;
      razorpay: { keyId: string; orderId: string; amountPaise: number } | null;
    };

function bookingHumanId(): string {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SCB-${stamp}-${rand}`;
}

/**
 * Create a booking. The token amount and the on-road price are read from the
 * database, never from the browser.
 */
export const startBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; name: string; phone: string; email?: string; address?: string; colour?: string }) => ({
    slug: text(data?.slug, 160),
    name: text(data?.name, 120),
    phone: phone10(data?.phone),
    email: text(data?.email, 160),
    address: text(data?.address, 400),
    colour: text(data?.colour, 60),
  }))
  .handler(async ({ data }): Promise<StartBookingResult> => {
    if (!data.name || data.phone.length !== 10) return { error: "Please give your name and a 10-digit mobile number." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, name, status, product_kind, vehicle_specs(variant, registration_required), vehicle_pricing(ex_showroom, rto, insurance, accessories, subsidy, on_road, token_amount)")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!product || product.product_kind !== "vehicle" || product.status !== "visible") {
      return { error: "This model is not available for booking right now." };
    }
    const priceRow = (Array.isArray(product.vehicle_pricing) ? product.vehicle_pricing[0] : product.vehicle_pricing) as
      | Record<string, number>
      | null;
    const specRow = (Array.isArray(product.vehicle_specs) ? product.vehicle_specs[0] : product.vehicle_specs) as
      | { variant?: string | null; registration_required?: boolean }
      | null;
    const onRoad = Number(priceRow?.['on_road'] ?? 0);
    if (!priceRow || onRoad <= 0) return { error: "The price for this model is not published yet. Please call the shop." };

    const tokenAmount = Math.min(Math.max(Number(priceRow['token_amount'] ?? 0), 0), onRoad);
    const { currentUserId } = await import("@/lib/auth.server");
    const userId = await currentUserId();

    const humanId = bookingHumanId();
    const { data: booking, error } = await supabaseAdmin
      .from("vehicle_bookings")
      .insert({
        human_id: humanId,
        product_id: product.id,
        profile_id: userId ?? null,
        customer_name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        colour: data.colour || null,
        variant: specRow?.variant ?? null,
        price_breakdown: {
          exShowroom: Number(priceRow['ex_showroom'] ?? 0),
          rto: specRow?.registration_required === false ? 0 : Number(priceRow['rto'] ?? 0),
          insurance: Number(priceRow['insurance'] ?? 0),
          accessories: Number(priceRow['accessories'] ?? 0),
          subsidy: Number(priceRow['subsidy'] ?? 0),
        },
        on_road_total: onRoad,
        token_amount: tokenAmount,
        balance_due: Math.max(0, onRoad - tokenAmount),
      } as never)
      .select("id, public_token")
      .single();
    if (error || !booking) return { error: "Could not start the booking. Please try again." };

    await supabaseAdmin.from("booking_events").insert({ booking_id: booking.id, status: "booked", note: "Booking started", created_by: "customer" } as never);

    const { createRazorpayOrder, razorpayKeys } = await import("@/lib/razorpay.server");
    if (!razorpayKeys().configured || tokenAmount <= 0) {
      // Online payment is not switched on: hold the booking and let the shop collect the token.
      const { notifyBookingPlaced } = await import("@/lib/vehicle-notify.server");
      await notifyBookingPlaced(booking.id);
      return { bookingId: booking.id, humanId, token: String(booking.public_token), tokenAmount, razorpay: null };
    }

    const created = await createRazorpayOrder({
      amountRupees: tokenAmount,
      receipt: humanId,
      notes: { booking_id: booking.id, human_id: humanId },
    });
    if ("error" in created) return { error: created.error };

    await supabaseAdmin
      .from("vehicle_bookings")
      .update({ provider_order_id: created.order.id, payment_provider: "razorpay" })
      .eq("id", booking.id);

    return {
      bookingId: booking.id,
      humanId,
      token: String(booking.public_token),
      tokenAmount,
      razorpay: { keyId: razorpayKeys().keyId, orderId: created.order.id, amountPaise: Math.round(tokenAmount * 100) },
    };
  });

/** Verify the token payment handed back by Razorpay. */
export const verifyBookingPayment = createServerFn({ method: "POST" })
  .inputValidator((data: { bookingId: string; razorpayOrderId: string; paymentId: string; signature: string }) => ({
    bookingId: String(data?.bookingId ?? ""),
    razorpayOrderId: String(data?.razorpayOrderId ?? ""),
    paymentId: String(data?.paymentId ?? ""),
    signature: String(data?.signature ?? ""),
  }))
  .handler(async ({ data }): Promise<{ paid: boolean; error?: string }> => {
    if (!/^[0-9a-f-]{36}$/i.test(data.bookingId)) return { paid: false, error: "Unknown booking." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking } = await supabaseAdmin
      .from("vehicle_bookings")
      .select("id, provider_order_id, payment_status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) return { paid: false, error: "Unknown booking." };
    if (booking.payment_status === "paid") return { paid: true };
    if (booking.provider_order_id !== data.razorpayOrderId) return { paid: false, error: "Payment does not match this booking." };

    const { verifyCheckoutSignature } = await import("@/lib/razorpay.server");
    if (!verifyCheckoutSignature(data.razorpayOrderId, data.paymentId, data.signature)) {
      return { paid: false, error: "We could not verify this payment. If money was taken it will be confirmed shortly." };
    }

    await supabaseAdmin
      .from("vehicle_bookings")
      .update({ payment_status: "paid", provider_payment_id: data.paymentId, updated_at: new Date().toISOString() })
      .eq("id", data.bookingId);
    await supabaseAdmin
      .from("booking_events")
      .insert({ booking_id: data.bookingId, status: "booked", note: "Token amount received", created_by: "razorpay" } as never);

    const { notifyBookingPlaced } = await import("@/lib/vehicle-notify.server");
    await notifyBookingPlaced(data.bookingId);
    return { paid: true };
  });

export type BookingView = {
  humanId: string;
  modelName: string;
  modelSlug: string;
  colour: string | null;
  variant: string | null;
  status: string;
  paymentStatus: string;
  onRoadTotal: number;
  tokenAmount: number;
  balanceDue: number;
  priceBreakdown: Record<string, number>;
  expectedDelivery: string | null;
  createdAt: string;
  events: { status: string; note: string | null; at: string }[];
};

/** Follow a booking with the link the customer was given. */
export const bookingByToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => ({ token: String(data?.token ?? "") }))
  .handler(async ({ data }): Promise<BookingView | null> => {
    if (!/^[0-9a-f-]{36}$/i.test(data.token)) return null;
    const { publicClient } = await import("@/lib/supabase-public.server");
    const { data: rows } = await publicClient().rpc("booking_by_token", { p_token: data.token });
    const row = (Array.isArray(rows) ? rows[0] : rows) as Record<string, any> | undefined;
    if (!row) return null;
    return {
      humanId: String(row['human_id']),
      modelName: String(row['model_name']),
      modelSlug: String(row['model_slug']),
      colour: row['colour'] ?? null,
      variant: row['variant'] ?? null,
      status: String(row['status']),
      paymentStatus: String(row['payment_status']),
      onRoadTotal: Number(row['on_road_total'] ?? 0),
      tokenAmount: Number(row['token_amount'] ?? 0),
      balanceDue: Number(row['balance_due'] ?? 0),
      priceBreakdown: (row['price_breakdown'] ?? {}) as Record<string, number>,
      expectedDelivery: row['expected_delivery'] ?? null,
      createdAt: String(row['created_at']),
      events: ((row['events'] ?? []) as Record<string, any>[]).map((e) => ({
        status: String(e['status']),
        note: e['note'] ?? null,
        at: String(e['at']),
      })),
    };
  });
