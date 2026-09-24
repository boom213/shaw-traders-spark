import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneOtpForm } from "@/components/site/PhoneOtpForm";
import { ProductCard } from "@/components/site/ProductCard";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { myOrders } from "@/lib/orders.functions";
import { reorderItems } from "@/lib/trade.functions";
import { BUSINESS, canonical, formatINR, statusLabel } from "@/lib/catalog";
import { productsByIdsQuery } from "@/lib/queries";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Sign In / Register — Shaw Traders EV" },
      { name: "description", content: "Create your free account or sign in with your mobile number. Track orders, save parts and get WhatsApp updates from Shaw Traders EV." },
      { property: "og:title", content: "Sign In / Register — Shaw Traders EV" },
      { property: "og:description", content: "Create your free account or sign in with your mobile number. Track orders, save parts and get WhatsApp updates from Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/account") }],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: "/trade" } => (s.next === "/trade" ? { next: "/trade" } : {}),
  component: AccountPage,
});

function AccountPage() {
  const { authReady, user } = useStore();
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && next) void navigate({ to: next });
  }, [user, next, navigate]);
  if (!authReady) return <div className="container mx-auto px-4 py-16 text-sm text-muted-foreground">Loading…</div>;
  return user ? <Dashboard /> : <AuthPanel />;
}

function AuthPanel() {
  const [busy, setBusy] = useState(false);

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/account${window.location.search}` });
    if (result.redirected) return;
    setBusy(false);
    if (result.error) return toast.error(result.error.message || "Google sign-in failed");
    toast.success("You're signed in");
  };


  return (
    <div className="container mx-auto grid place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <span className="grid size-11 place-items-center rounded-2xl bg-surface text-primary">
          <UserRound className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in with your mobile number to see your orders and saved parts. Need help? Call {BUSINESS.phone}.
        </p>

        <div className="mt-6"><PhoneOtpForm idPrefix="account" /></div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void google()}>
          Continue with Google
        </Button>

        <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-muted-foreground">Garage, mechanic, or fleet dealer? Looking for trade pricing and bulk order terms?</p>
          <Link to="/trade" className="mt-1.5 inline-flex min-h-10 items-center font-semibold text-foreground underline-offset-4 hover:underline">
            Register for a Trade &amp; Wholesale Account →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { lists, user, addToCart } = useStore();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const mobile = user?.phone ? `+${String(user.phone).replace(/\D/g, "")}` : "";

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone, email").eq("id", user!.id).maybeSingle();
      return data;
    },
    enabled: Boolean(user),
  });

  useEffect(() => {
    if (profile) {
      setName(profile.full_name ?? "");
      setEmail(profile.email ?? "");
    } else if (profile === null && user) {
      void supabase.from("profiles").upsert({ id: user.id, phone: mobile }, { onConflict: "id" });
    }
  }, [profile, user, mobile]);

  const { data: orders, isPending: ordersPending } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => myOrders(),
    enabled: Boolean(user),
  });

  const ids = Array.from(new Set([...lists.saved, ...lists.recentlyViewed]));
  const { data: products } = useQuery(productsByIdsQuery(ids));
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const saved = lists.saved.map((id) => byId.get(id)).filter(Boolean);
  const viewed = lists.recentlyViewed.map((id) => byId.get(id)).filter(Boolean);

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user!.id, full_name: name, phone: mobile, email: email.trim() || null });
    setSaving(false);
    if (error) return toast.error("Could not save your details");
    toast.success("Details saved");
  };

  return (
    <div className="container mx-auto space-y-10 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold md:text-3xl">Hello, {name || mobile}</h1>
          <p className="text-sm text-muted-foreground">
            Your orders and saved parts follow you on any device. Call {BUSINESS.phone} for any help.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            toast.success("Signed out");
          }}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold">Your details</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input value={mobile} readOnly aria-label="Mobile number" />
          <Input placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button disabled={saving} onClick={() => void saveProfile()}>Save details</Button>
      </section>

      <section className="space-y-3">
        <SectionHeading title="Your orders" subtitle="Every order placed with your account" />
        {ordersPending ? (
          <div className="grid gap-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : !orders || orders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            No orders yet. <Link to="/shop" className="text-primary underline">Start shopping</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="space-y-2">
              <Link
                key={o.id}
                to="/order/$id"
                params={{ id: o.id }}
                search={{ t: o.token }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div>
                  <p className="font-semibold">{o.humanId}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.placedAt).toLocaleDateString("en-IN")} · {o.items.length} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatINR(o.total)}</p>
                  <p className="text-xs text-primary">{statusLabel(o.status)}</p>
                </div>
              </Link>
              <button
                type="button"
                className="text-xs text-primary underline"
                onClick={async () => {
                  const res = await reorderItems({ data: { orderId: o.id } });
                  if (!res.items.length) return toast.error("Nothing from that order is available right now.");
                  res.items.forEach((i) => addToCart(i.productId, i.qty));
                  toast.success(`${res.items.length} item(s) added to your cart`);
                  void navigate({ to: "/cart" });
                }}
              >
                Order these again
              </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {saved.length > 0 && (
        <section className="space-y-3">
          <SectionHeading title="Saved for later" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {saved.map((p) => p && <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {viewed.length > 0 && (
        <section className="space-y-3">
          <SectionHeading title="Recently viewed" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {viewed.map((p) => p && <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
