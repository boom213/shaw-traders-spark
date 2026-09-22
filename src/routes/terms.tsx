import { createFileRoute } from "@tanstack/react-router";
import { PolicyList, PolicyPage, PolicySection } from "@/components/site/Policy";
import { BUSINESS, canonical } from "@/lib/catalog";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Shaw Traders EV" },
      { name: "description", content: "The terms on which Shaw Traders EV sells EV spare parts, batteries and chargers online and at the counter in Bud Bud, Bardhaman." },
      { property: "og:title", content: "Terms of Service — Shaw Traders EV" },
      { property: "og:description", content: "Ordering, pricing, payment, delivery and liability terms for Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/terms") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/terms") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      intro={`These terms apply whenever you buy from ${BUSINESS.name}, online or at our counter. By placing an order you accept them.`}
    >
      <PolicySection heading="Who you are buying from">
        <p>
          You are buying directly from {BUSINESS.name}, a retail and wholesale seller of electric-vehicle spare parts
          based in Bud Bud, Bardhaman, West Bengal. Full seller details are at the bottom of this page.
        </p>
      </PolicySection>

      <PolicySection heading="Placing an order">
        <PolicyList
          items={[
            "You must be 18 or older and give a working Indian mobile number.",
            "Your order is a request to buy. It becomes a contract only when we confirm it and the payment succeeds, or when we accept it for cash on delivery.",
            "We may refuse or cancel an order if the item is out of stock, the price or description was shown wrongly, the delivery address is outside our service area, or we suspect fraud. Any money already paid is refunded in full.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Prices">
        <PolicyList
          items={[
            "All prices are in Indian Rupees and include GST unless the page says otherwise. The GST amount is shown separately on your invoice.",
            "Some parts are listed as 'Price on request'. These have no fixed price online because the rate changes; ask on WhatsApp and we will quote you.",
            "Delivery charges, where they apply, are shown before you pay.",
            "If a price is shown wrongly because of an error, we will tell you before dispatch and you can confirm the corrected price or cancel for a full refund.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Payment">
        <p>
          You can pay by UPI, debit or credit card, netbanking or wallet through our payment partner, or by cash on
          delivery where it is available for your order value and PIN code. We never store your card or UPI details.
        </p>
      </PolicySection>

      <PolicySection heading="Delivery, returns and warranty">
        <p>
          Delivery areas, charges and timelines are in our Shipping Policy. Cancellations, returns, replacements and
          refunds are covered by our Returns, Replacement and Refund Policy. Manufacturer warranty on batteries, motors,
          controllers and chargers is covered by our Warranty Policy. Those pages form part of these terms.
        </p>
      </PolicySection>

      <PolicySection heading="Fitment is your responsibility">
        <p>
          The compatibility information on this website is a guide based on the details manufacturers give us. EV models
          vary between batches. Please check the part number, voltage, capacity and mounting against your own vehicle, or
          ask us on WhatsApp before ordering. We are not responsible for a part that is ordered for the wrong model.
        </p>
      </PolicySection>

      <PolicySection heading="Fitting and safety">
        <p>
          Batteries, chargers, motors and controllers should be fitted by a qualified technician. Damage caused by wrong
          fitting, wrong voltage, water ingress, tampering or use beyond the rated load is not covered by any warranty.
        </p>
      </PolicySection>

      <PolicySection heading="Your account">
        <p>
          You sign in with a one-time code sent to your mobile number. Keep your phone secure — orders placed after a
          successful code entry are treated as yours. Tell us immediately if your number is lost or changed.
        </p>
      </PolicySection>

      <PolicySection heading="Our liability">
        <p>
          Our responsibility for any order is limited to the amount you paid for that order. We are not liable for loss
          of earnings, vehicle downtime or other indirect losses. Nothing here limits rights you have under the Consumer
          Protection Act, 2019.
        </p>
      </PolicySection>

      <PolicySection heading="Content and images">
        <p>
          Product photographs, descriptions and the site design belong to us or our suppliers and may not be copied for
          commercial use. Images are representative; the part you receive may differ slightly in appearance.
        </p>
      </PolicySection>

      <PolicySection heading="Disputes">
        <p>
          These terms are governed by Indian law. Any dispute is subject to the courts at Bardhaman, West Bengal. Please
          contact our complaints officer first — most issues are settled the same day.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
