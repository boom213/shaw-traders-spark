import { createFileRoute } from "@tanstack/react-router";
import { PolicyList, PolicyPage, PolicySection } from "@/components/site/Policy";
import { BUSINESS, canonical } from "@/lib/catalog";

export const Route = createFileRoute("/warranty")({
  head: () => ({
    meta: [
      { title: "Warranty Policy — Shaw Traders EV" },
      { name: "description", content: "Manufacturer warranty on EV batteries, motors, controllers and chargers sold by Shaw Traders EV — cover, exclusions and how to claim." },
      { property: "og:title", content: "Warranty Policy — Shaw Traders EV" },
      { property: "og:description", content: "What is covered, what is not, and how to make a warranty claim on EV parts." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/warranty") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/warranty") }],
  }),
  component: WarrantyPage,
});

function WarrantyPage() {
  return (
    <PolicyPage
      title="Warranty Policy"
      intro="Parts we sell carry the manufacturer's warranty. We handle the claim for you — you deal with us, not with the factory."
    >
      <PolicySection heading="What the warranty covers">
        <p>
          The warranty covers manufacturing defects — a part that fails in normal use within the warranty period because
          of how it was made. The exact period is printed on each product page and on your invoice. Typical cover:
        </p>
        <PolicyList
          items={[
            "Lithium and lead-acid EV batteries: as stated on the product page, usually 6 to 12 months, pro-rata where the manufacturer applies it.",
            "Motors and controllers: usually 6 to 12 months.",
            "Chargers: usually 6 months.",
            "Body parts, lighting, brake parts, wheels and accessories: usually 1 to 3 months against manufacturing defects only.",
          ]}
        />
        <p>The period runs from the invoice date, not from the fitting date.</p>
      </PolicySection>

      <PolicySection heading="What is not covered">
        <PolicyList
          items={[
            "Normal wear — brake pads, tyres, bulbs, bearings, cables and gradual loss of battery range with age and use.",
            "Damage from wrong fitting, wrong voltage, a non-matching charger, reverse polarity or loose wiring.",
            "Water ingress, fire, accident, overloading beyond the rated capacity, or use in a vehicle the part is not rated for.",
            "Physical damage, dents, cuts, burnt terminals or opened casings.",
            "Batteries left fully discharged for long periods, or overcharged.",
            "Any part whose serial number, warranty seal or sticker is removed, damaged or altered.",
            "Repairs or modifications carried out by anyone other than an authorised technician.",
            "Consequential losses such as vehicle downtime, loss of earnings or towing charges.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="How to claim">
        <PolicyList
          items={[
            "Call or WhatsApp us on " + BUSINESS.phone + " with your order number, the problem and a photo or short video.",
            "Keep the invoice — it is your warranty proof. A claim without the invoice or with an unreadable serial number cannot be processed.",
            "Bring the part to our counter, or send it to us; for large items in our local area we can collect it.",
            "We inspect the part and, where needed, send it to the manufacturer for testing.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Timelines">
        <PolicyList
          items={[
            "We acknowledge a claim within 24 hours.",
            "Parts we can judge ourselves: decision within 2–3 working days.",
            "Claims that must go to the manufacturer, such as batteries and motors: usually 10–21 working days, sometimes longer for imported items. We keep you updated.",
            "Approved claims are repaired or replaced within 3 working days of the decision. Where neither is possible, we refund the manufacturer-approved value.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Replacement warranty">
        <p>
          A replacement part carries the balance of the original warranty period, not a fresh one, unless the
          manufacturer states otherwise in writing.
        </p>
      </PolicySection>

      <PolicySection heading="Warranty is not a return">
        <p>
          A warranty claim is different from a return. If the part is simply unwanted or the wrong model, see our
          Returns, Replacement and Refund Policy — that window is 7 days from delivery.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
