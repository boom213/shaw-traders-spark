import { createFileRoute } from "@tanstack/react-router";
import { PolicyList, PolicyPage, PolicySection } from "@/components/site/Policy";
import { BUSINESS, canonical } from "@/lib/catalog";

export const Route = createFileRoute("/shipping")({
  head: () => ({
    meta: [
      { title: "Shipping Policy — Shaw Traders EV" },
      { name: "description", content: "Where Shaw Traders EV delivers EV spare parts, what delivery costs, how long it takes, and how to track your parcel." },
      { property: "og:title", content: "Shipping Policy — Shaw Traders EV" },
      { property: "og:description", content: "Delivery areas, charges and timelines for EV parts across West Bengal and India." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/shipping") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/shipping") }],
  }),
  component: ShippingPage,
});

function ShippingPage() {
  return (
    <PolicyPage
      title="Shipping Policy"
      intro="Where we deliver, what it costs, how long it takes and how to follow your parcel."
    >
      <PolicySection heading="Where we deliver">
        <PolicyList
          items={[
            "Bud Bud, Bardhaman and nearby towns — our own delivery, and counter pickup from our shop.",
            "Across West Bengal — by courier and parcel service.",
            "Rest of India — by courier, for parts the carrier accepts.",
            "Batteries are restricted goods for air transport, so they travel by surface only. Some remote PIN codes and islands cannot be served for batteries; we tell you before taking payment.",
            "We do not ship outside India.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Delivery charges">
        <PolicyList
          items={[
            "Counter pickup from our shop: free.",
            "Standard delivery: free on most orders; any charge is shown on the checkout page before you pay.",
            "Express delivery, where available: ₹120.",
            "Heavy items such as batteries and motors to far locations may carry an extra courier charge, which we quote and confirm with you before dispatch.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="How long it takes">
        <PolicyList
          items={[
            "Orders are packed within 1 working day. Orders placed after 6 pm, on Sundays or on holidays are packed the next working day.",
            "Bud Bud and Bardhaman district: 1–2 working days.",
            "Rest of West Bengal: 2–4 working days.",
            "Rest of India: 4–8 working days.",
            "Counter pickup: ready the same day in most cases; we message you when it is ready.",
            "Out-of-stock or specially sourced parts take longer — we tell you the expected date before you pay.",
          ]}
        />
        <p>
          You can check the estimate for your own PIN code on any product page before ordering.
        </p>
      </PolicySection>

      <PolicySection heading="Cash on delivery">
        <p>
          Cash on delivery is available for orders up to the limit shown at checkout and only in the PIN codes we serve
          for it. Larger orders must be paid online. The limit and the serviceable PIN codes are shown on the checkout
          page for your address.
        </p>
      </PolicySection>

      <PolicySection heading="Tracking your parcel">
        <PolicyList
          items={[
            "We message you on WhatsApp at each step — confirmed, packed, shipped and delivered.",
            "Once shipped, the courier name and tracking number appear on your order page with a tracking link.",
            "If tracking has not moved for 3 working days, call or WhatsApp us on " + BUSINESS.phone + " and we will chase the courier.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Receiving your order">
        <PolicyList
          items={[
            "Please check the parcel in front of the delivery person. If the outer box is torn, wet or opened, refuse it and tell us the same day.",
            "Report transit damage within 48 hours of delivery with photographs of the box and the part, so we can claim from the courier.",
            "If nobody is available, the courier normally tries again the next working day. After three failed attempts the parcel returns to us and we refund the order less any courier cost already incurred.",
            "An incorrect or incomplete address can delay or return a parcel; please check your address and PIN code before paying.",
          ]}
        />
      </PolicySection>
    </PolicyPage>
  );
}
