import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BUSINESS } from "@/lib/catalog";
import { shopSettingsQuery, type ShopSettings } from "@/lib/shop-settings";

/** Shared shell for the legal pages: heading, last-updated line and readable body. */
export function PolicyPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const { data: settings } = useQuery(shopSettingsQuery());
  const updated = settings?.policyUpdatedAt
    ? new Date(settings.policyUpdatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{intro}</p>
        {updated && <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>}
        <div className="mt-8 grid gap-7 text-sm leading-relaxed text-muted-foreground">{children}</div>
        <SellerBlock settings={settings} />
      </div>
    </div>
  );
}

export function PolicySection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h2 className="font-display text-lg font-bold text-foreground">{heading}</h2>
      {children}
    </section>
  );
}

export function PolicyList({ items }: { items: string[] }) {
  return (
    <ul className="grid list-disc gap-1.5 pl-5">
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/** Seller identity block — required on every policy page by Indian e-commerce rules. */
export function SellerBlock({ settings }: { settings?: ShopSettings }) {
  const legalName = settings?.legalName || BUSINESS.name;
  const address = settings?.billingAddress || BUSINESS.address;
  const email = settings?.supportEmail;

  return (
    <div className="mt-10 rounded-2xl border border-border bg-surface p-5 text-sm">
      <h2 className="font-display text-base font-bold text-foreground">Seller details</h2>
      <dl className="mt-3 grid gap-1.5 text-muted-foreground">
        <div><dt className="inline font-medium text-foreground">Business name: </dt><dd className="inline">{legalName}</dd></div>
        <div><dt className="inline font-medium text-foreground">Address: </dt><dd className="inline">{address}</dd></div>
        <div>
          <dt className="inline font-medium text-foreground">Phone: </dt>
          <dd className="inline"><a href={`tel:${BUSINESS.phone}`} className="hover:text-foreground">{BUSINESS.phone}</a></dd>
        </div>
        {email && (
          <div>
            <dt className="inline font-medium text-foreground">Email: </dt>
            <dd className="inline"><a href={`mailto:${email}`} className="hover:text-foreground">{email}</a></dd>
          </div>
        )}
        {settings?.gstin && (
          <div><dt className="inline font-medium text-foreground">GSTIN: </dt><dd className="inline">{settings.gstin}</dd></div>
        )}
      </dl>
      {settings?.grievanceName ? (
        <p className="mt-3 text-muted-foreground">
          Complaints officer: <span className="font-medium text-foreground">{settings.grievanceName}</span>
          {settings.grievanceEmail ? ` · ${settings.grievanceEmail}` : ""}
          {settings.grievancePhone ? ` · ${settings.grievancePhone}` : ""}
        </p>
      ) : (
        <p className="mt-3 text-muted-foreground">
          Complaints are handled at the counter — call or WhatsApp {BUSINESS.phone} and we reply within 48 hours.
        </p>
      )}
    </div>
  );
}
