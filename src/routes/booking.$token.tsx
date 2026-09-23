import { createFileRoute, Link } from "@tanstack/react-router";
import { SectionHeading } from "@/components/site/Empty";
import { Button } from "@/components/ui/button";
import { BUSINESS, formatINR, whatsappLink } from "@/lib/catalog";
import { bookingByToken } from "@/lib/booking.functions";
import { BOOKING_FLOW, bookingStatusLabel } from "@/lib/vehicles";

export const Route = createFileRoute("/booking/$token")({
  loader: async ({ params }) => await bookingByToken({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Your Scooter Booking" },
      { name: "description", content: "Follow your Shaw Traders EV scooter booking: allotment, RTO, delivery date and the balance due." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Your Scooter Booking — Shaw Traders EV" },
      { property: "og:description", content: "Booking stage, token paid and balance due at delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const booking = Route.useLoaderData();

  if (!booking) {
    return (
      <div className="container-page py-12">
        <SectionHeading as="h1" title="Booking not found" subtitle="Please use the link we sent you, or call the shop." />
        <Button asChild>
          <a href={`tel:${BUSINESS.phone}`}>Call {BUSINESS.phone}</a>
        </Button>
      </div>
    );
  }

  const stageIndex = BOOKING_FLOW.findIndex((s) => s.value === booking.status);

  return (
    <div className="container-page max-w-3xl py-8">
      <SectionHeading as="h1" title={`Booking ${booking.humanId}`} subtitle={`${booking.modelName}${booking.colour ? ` · ${booking.colour}` : ""}`} />

      <ol className="mb-8 grid gap-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        {BOOKING_FLOW.map((s, i) => (
          <li key={s.value} className="flex items-center gap-3 text-sm">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                i <= stageIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= stageIndex ? "font-semibold" : "text-muted-foreground"}>{s.label}</span>
          </li>
        ))}
        {booking.status === "cancelled" && <li className="text-sm font-semibold text-destructive">This booking was cancelled.</li>}
      </ol>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 text-sm shadow-[var(--shadow-card)]">
        <div className="flex justify-between"><span className="text-muted-foreground">On-road price</span><span className="font-semibold">{formatINR(booking.onRoadTotal)}</span></div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Token {booking.paymentStatus === "paid" ? "paid" : "due"}</span>
          <span className="font-semibold">{formatINR(booking.tokenAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-3">
          <span className="text-muted-foreground">Balance at delivery</span>
          <span className="font-display text-lg font-bold">{formatINR(booking.balanceDue)}</span>
        </div>
        {booking.expectedDelivery && (
          <p className="text-muted-foreground">Expected delivery: {new Date(booking.expectedDelivery).toLocaleDateString("en-IN")}</p>
        )}
      </div>

      {booking.events.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-bold">What has happened so far</h2>
          <ul className="grid gap-3 text-sm">
            {booking.events.map((e, i) => (
              <li key={i} className="rounded-xl border border-border bg-surface px-4 py-3">
                <p className="font-medium">{bookingStatusLabel(e.status)}</p>
                {e.note && <p className="text-muted-foreground">{e.note}</p>}
                <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString("en-IN")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <a href={whatsappLink(`Hello ${BUSINESS.name}, about booking ${booking.humanId}.`)} target="_blank" rel="noreferrer">
            Ask about this booking
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/scooters/$slug" params={{ slug: booking.modelSlug }}>View the model</Link>
        </Button>
      </div>
    </div>
  );
}
