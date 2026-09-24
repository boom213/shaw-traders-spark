import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone } from "lucide-react";
import { BUSINESS } from "@/lib/catalog";
import { categoriesQuery } from "@/lib/queries";
import { shopSettingsQuery } from "@/lib/shop-settings";
import { reopenConsent } from "@/components/site/CookieConsent";

export function Footer() {
  const { data: categories } = useQuery(categoriesQuery());
  const { data: settings } = useQuery(shopSettingsQuery());
  const legalName = settings?.legalName || BUSINESS.name;

  return (
    <footer className="mt-20 border-t border-border bg-surface pb-24 lg:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Shaw Traders EV" width={36} height={36} className="size-9 rounded-xl object-contain" />
            <span className="font-display text-base font-bold">Shaw Traders EV</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{BUSINESS.tagline} for EV owners, mechanics, workshops and dealers.</p>
          <p className="mt-4 flex gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            {BUSINESS.address}
          </p>
          <a href={`tel:${BUSINESS.phone}`} className="mt-2 flex items-center gap-2 text-sm font-medium hover:text-primary">
            <Phone className="size-4" /> {BUSINESS.phone}
          </a>
          {settings?.supportEmail && (
            <a href={`mailto:${settings.supportEmail}`} className="mt-2 block text-sm text-muted-foreground hover:text-foreground">
              {settings.supportEmail}
            </a>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold">Shop</h4>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {(categories ?? []).slice(0, 7).map((c) => (
              <li key={c.slug}>
                <Link to="/category/$slug" params={{ slug: c.slug }} className="hover:text-foreground">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Customer</h4>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li><Link to="/account" className="hover:text-foreground">My Account</Link></li>
            <li><Link to="/track" className="hover:text-foreground">Track Order</Link></li>
            <li><Link to="/cart" className="hover:text-foreground">Cart</Link></li>
            <li><Link to="/offers" className="hover:text-foreground">Offers</Link></li>
            <li><Link to="/scooters" className="hover:text-foreground">Electric Scooters</Link></li>
            <li><Link to="/service" className="hover:text-foreground">Scooter Service & History</Link></li>
            <li><Link to="/find-parts" className="hover:text-foreground">Find Parts for Your EV</Link></li>
            <li><Link to="/about" className="hover:text-foreground">About Shaw Traders</Link></li>
            <li><Link to="/bulk" className="hover:text-foreground">Bulk Order Enquiry (one-off quote)</Link></li>
            <li><Link to="/trade" className="hover:text-foreground">Trade / Wholesale Account (trade prices &amp; credit)</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Policies</h4>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li><Link to="/returns" className="hover:text-foreground">Returns, Replacement & Refund</Link></li>
            <li><Link to="/shipping" className="hover:text-foreground">Shipping Policy</Link></li>
            <li><Link to="/warranty" className="hover:text-foreground">Warranty Policy</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact & Grievance Officer</Link></li>
            <li>
              <button type="button" onClick={reopenConsent} className="hover:text-foreground">
                Cookie settings
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        <p>
          {legalName}
          {settings?.gstin ? ` · GSTIN ${settings.gstin}` : ""}
          {settings?.gstEnabled ? ` · All prices ${settings.pricesIncludeGst ? "include" : "exclude"} GST at ${settings.gstRate}%` : ""}
        </p>
        <p className="mt-1">© {new Date().getFullYear()} Shaw Traders EV, Bud Bud, Bardhaman. All rights reserved.</p>
      </div>
    </footer>
  );
}
