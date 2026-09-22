import { createFileRoute } from "@tanstack/react-router";
import { PolicyList, PolicyPage, PolicySection } from "@/components/site/Policy";
import { BUSINESS, canonical } from "@/lib/catalog";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Shaw Traders EV" },
      { name: "description", content: "What Shaw Traders EV collects, why, how long we keep it and your rights under India's Digital Personal Data Protection Act, 2023." },
      { property: "og:title", content: "Privacy Policy — Shaw Traders EV" },
      { property: "og:description", content: "How Shaw Traders EV handles your personal data under the DPDP Act, 2023." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical("/privacy") },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/privacy") }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      intro={`How ${BUSINESS.name} collects, uses, stores and protects your personal data, and the rights you have under India's Digital Personal Data Protection Act, 2023.`}
    >
      <PolicySection heading="What we collect">
        <PolicyList
          items={[
            "Your mobile number — used to sign you in with a one-time code and to contact you about your order.",
            "Your name and delivery address — needed to deliver the parts you buy.",
            "Your email address — optional, used only if you give it, for receipts and replies.",
            "Order details — the parts you bought, the amount, the payment method and the delivery status.",
            "Payment reference numbers from our payment partner. We never see or store your card number, UPI PIN or bank password.",
            "Basic technical information your browser sends, such as the pages you view, so the site works and stays secure.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Why we use it">
        <PolicyList
          items={[
            "To take, pack, deliver and invoice your order.",
            "To send you order updates on WhatsApp and to answer your questions.",
            "To handle cancellations, returns, replacements and refunds.",
            "To keep the accounts and tax records the law requires us to keep.",
            "To prevent fraud and misuse of the website.",
          ]}
        />
        <p>
          We do not sell your personal data to anyone, and we do not use it for advertising profiles.
        </p>
      </PolicySection>

      <PolicySection heading="Who we share it with">
        <PolicyList
          items={[
            "Delivery partners and couriers — your name, address and phone number, only to deliver the order.",
            "Our payment partner — to take the payment and process any refund.",
            "Our messaging provider — your phone number, to send order updates on WhatsApp.",
            "Government authorities, when we are required by Indian law to provide information.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="How long we keep it">
        <PolicyList
          items={[
            "Order and invoice records: 8 years, as required by Indian tax and accounting law.",
            "Your account details (name, phone, email, saved addresses): until you ask us to delete the account.",
            "Cart, wishlist and recently viewed items: until you clear them, or 12 months after your last visit.",
            "Sign-in attempt logs and message logs: 12 months, for security and support.",
          ]}
        />
      </PolicySection>

      <PolicySection heading="Your rights under the DPDP Act, 2023">
        <PolicyList
          items={[
            "Access — ask us for a summary of the personal data we hold about you and who we shared it with.",
            "Correction — ask us to correct or complete anything inaccurate, and to update it.",
            "Erasure — ask us to delete your data, except records we must legally keep (such as tax invoices).",
            "Withdraw consent — stop order messages or close your account at any time; this does not affect anything already done lawfully.",
            "Nominate — name someone who can exercise these rights for you if you die or become unable to act.",
            "Grievance redressal — raise a complaint with the person named below. If you are not satisfied with our answer, you may complain to the Data Protection Board of India.",
          ]}
        />
        <p>
          To use any of these rights, call or WhatsApp {BUSINESS.phone}, or write to the complaints officer named below.
          We reply within 48 hours and resolve requests within 30 days.
        </p>
      </PolicySection>

      <PolicySection heading="Children">
        <p>
          This website is meant for adults. We do not knowingly collect data about children under 18. If you believe a
          child has given us data, tell us and we will delete it.
        </p>
      </PolicySection>

      <PolicySection heading="Cookies">
        <p>
          We use a small number of essential cookies so the site works — keeping you signed in and remembering your cart.
          Anything beyond that, such as analytics, is only switched on if you accept it in the cookie banner. You can
          change your choice at any time from the link in the footer.
        </p>
      </PolicySection>

      <PolicySection heading="Security">
        <p>
          Data is stored on secure servers, sent over encrypted connections, and only staff who need it can see it.
          If a breach affects your data we will inform you and the Data Protection Board as the law requires.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
