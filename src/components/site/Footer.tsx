import { Link } from "@tanstack/react-router";
import { MapPin, Phone, Zap } from "lucide-react";
import { BUSINESS, CATEGORIES } from "@/lib/catalog";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface pb-24 lg:pb-0">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Zap className="size-5" />
            </span>
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
        </div>

        <div>
          <h4 className="text-sm font-semibold">Shop</h4>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {CATEGORIES.slice(0, 7).map((c) => (
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
            <li><Link to="/find-parts" className="hover:text-foreground">Find Parts for Your EV</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About Shaw Traders</Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
            <li><Link to="/bulk" className="hover:text-foreground">Dealer & Bulk Orders</Link></li>
            <li><Link to="/admin" className="hover:text-foreground">Admin Panel</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Shaw Traders EV, Bud Bud, Bardhaman. All rights reserved.
      </div>
    </footer>
  );
}
