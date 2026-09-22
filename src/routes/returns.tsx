import { createFileRoute } from "@tanstack/react-router";
import { PolicyList, PolicyPage, PolicySection } from "@/components/site/Policy";
import { BUSINESS, canonical } from "@/lib/catalog";

export const Route = createFileRoute("/returns")({
  head: () => ({
    meta: [
      { title: "Returns, Replacement & Refund Policy — Shaw Traders EV" },
      { name: "description", content: "7-day returns on EV parts, free replacement for wrong or damaged items, and refunds credited within 5–7 working days. Full timelines and conditions." },
      { property: "og:title", content: "Returns, Replacement & Refund Policy — Shaw Traders EV" },
      { property: "og:description", content: "7-day returns, free replacement for wrong or damaged parts, refunds in 5–7 working days." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/returns") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/returns") }],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  return (
    <PolicyPage
      title="Returns, Replacement & Refund Policy"
      intro="If a part is wrong, damaged or faulty, we make it right. Here is exactly what you can ask for and how long each step takes."
    >
      <PolicySection heading="Cancelling an order">
        <PolicyList
          items={[
            "Before dispatch: cancel free of charge from your order page or by WhatsApp. Any online payment is refunded in full.",
            "After dispatch but before delivery: tell us immediately. If the courier can be stopped we cancel it; otherwise refuse the parcel at the door and we treat it as a return.",
            "Cash-on-delivery orders that are repeatedly refused without reason may not be accepted in future.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Returning an item">
        <PolicyList
          items={[
            "Return window: 7 days from delivery.",
            "Raise the request from your order page, or call or WhatsApp us on " + BUSINESS.phone + ".",
            "We reply within 24 hours and, where a pickup is possible, collect within 2–4 working days. In areas the courier does not reach, you may send it by parcel service or bring it to our counter.",
            "The part must be unused, unfitted, in its original box with all accessories, manuals and the invoice.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="What can be returned">
        <PolicyList
          items={[
            "Wrong item delivered — free return and replacement.",
            "Item damaged in transit — free return, reported within 48 hours of delivery with photographs.",
            "Item faulty on arrival (dead on arrival) — free return or replacement, reported within 48 hours.",
            "Item does not match the description on this website — free return.",
            "Changed your mind, unused and unfitted — return accepted within 7 days; you pay the return courier charge.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="What cannot be returned">
        <PolicyList
          items={[
            "Parts that have been fitted, used, wired, charged beyond a test, cut or modified.",
            "Batteries and chargers whose warranty seal or serial sticker has been removed or tampered with.",
            "Items damaged by wrong fitting, wrong voltage, water, overload or accident.",
            "Parts ordered by you for the wrong vehicle model where our listing was correct, unless unused and returned within 7 days at your courier cost.",
            "Items sold as clearance, used or 'as is', and items made or sourced specially on your request.",
            "Consumables such as grease, lubricants, tapes and adhesives once opened.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Replacement">
        <PolicyList
          items={[
            "Approved replacements are dispatched within 2 working days of us receiving and checking the returned part.",
            "If the same part is out of stock, you may wait for it or take a full refund instead.",
            "For a wrong or damaged item, the replacement and both courier legs are free.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Refunds and timelines">
        <PolicyList
          items={[
            "We check a returned part within 2 working days of receiving it.",
            "Approved refunds are started the same day and reach you within 5–7 working days for UPI, card, netbanking and wallet payments — the exact date depends on your bank.",
            "Cash-on-delivery orders are refunded by UPI or bank transfer to an account in the buyer's name, within 5–7 working days of approval.",
            "Cancellations before dispatch are refunded within 3–5 working days.",
            "You are refunded the price you paid, including GST. The original delivery charge is refunded only when the fault was ours.",
            "If a return is rejected after inspection, we tell you why and send the part back to you at no charge.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="If you are not satisfied">
        <p>
          Contact the complaints officer named below. We acknowledge every complaint within 48 hours and settle it within
          30 days, as required by the Consumer Protection (E-Commerce) Rules, 2020.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
