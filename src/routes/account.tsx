import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/site/ProductCard";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { BUSINESS, formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your Account — Shaw Traders EV" },
      { name: "description", content: "Sign in to view your Shaw Traders EV orders, saved items, recently viewed EV parts and your contact details." },
      { property: "og:title", content: "Your Account — Shaw Traders EV" },
      { property: "og:description", content: "Your orders, saved EV parts and profile details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { state, ready } = useStore();
  if (!ready) return <div className="container mx-auto px-4 py-16 text-sm text-muted-foreground">Loading…</div>;
  return state.signedIn && state.account ? <Dashboard /> : <AuthPanel />;
}

function AuthPanel() {
  const { state, update } = useStore();
  const [suName, setSuName] = useState("");
  const [suPhone, setSuPhone] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPin, setSuPin] = useState("");
  const [inPhone, setInPhone] = useState("");
  const [inPin, setInPin] = useState("");

  const signUp = () => {
    if (suName.trim().length < 2) return toast.error("Please enter your full name");
    if (!/^\d{10}$/.test(suPhone.trim())) return toast.error("Enter a valid 10-digit mobile number");
    if (suPin.length < 4) return toast.error("Choose a PIN of at least 4 digits");
    update((s) => ({
      ...s,
      account: { name: suName.trim(), phone: suPhone.trim(), email: suEmail.trim(), pin: suPin },
      signedIn: true,
      profile: { ...s.profile, name: suName.trim(), phone: suPhone.trim(), email: suEmail.trim() },
    }));
    toast.success(`Welcome, ${suName.trim()}`);
  };

  const signIn = () => {
    const acc = state.account;
    if (!acc) return toast.error("No account on this device yet. Please create one.");
    if (acc.phone !== inPhone.trim() || acc.pin !== inPin) return toast.error("Mobile number or PIN is incorrect");
    update((s) => ({ ...s, signedIn: true }));
    toast.success(`Welcome back, ${acc.name}`);
  };

  return (
    <div className="container mx-auto grid place-items-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <span className="grid size-11 place-items-center rounded-2xl bg-surface text-primary">
          <UserRound className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to see your orders, saved parts and details. Need help? Call {BUSINESS.phone}.
        </p>

        <Tabs defaultValue={state.account ? "in" : "up"} className="mt-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in">Log in</TabsTrigger>
            <TabsTrigger value="up">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="in" className="space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="in-phone">Mobile number</Label>
              <Input id="in-phone" inputMode="numeric" value={inPhone} onChange={(e) => setInPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="in-pin">PIN</Label>
              <Input id="in-pin" type="password" inputMode="numeric" value={inPin} onChange={(e) => setInPin(e.target.value)} />
            </div>
            <Button className="w-full" onClick={signIn}>Log in</Button>
          </TabsContent>

          <TabsContent value="up" className="space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="su-name">Full name</Label>
              <Input id="su-name" value={suName} onChange={(e) => setSuName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-phone">Mobile number</Label>
              <Input id="su-phone" inputMode="numeric" value={suPhone} onChange={(e) => setSuPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-email">Email (optional)</Label>
              <Input id="su-email" type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-pin">Create a PIN</Label>
              <Input id="su-pin" type="password" inputMode="numeric" value={suPin} onChange={(e) => setSuPin(e.target.value)} />
            </div>
            <Button className="w-full" onClick={signUp}>Create account</Button>
          </TabsContent>
        </Tabs>

        <p className="mt-4 text-xs text-muted-foreground">Your account details stay on this device only.</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { state, update } = useStore();
  const account = state.account!;
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone);
  const [email, setEmail] = useState(account.email ?? "");

  const saveProfile = () => {
    update((s) => ({
      ...s,
      account: s.account ? { ...s.account, name, phone, email } : s.account,
      profile: { ...s.profile, name, phone, email },
    }));
    toast.success("Details saved");
  };

  const signOut = () => {
    update((s) => ({ ...s, signedIn: false }));
    toast.success("Signed out");
  };

  const saved = state.saved.map((id) => state.products.find((p) => p.id === id)).filter(Boolean);
  const viewed = state.recentlyViewed.map((id) => state.products.find((p) => p.id === id)).filter(Boolean);

  return (
    <div className="container mx-auto space-y-10 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold md:text-3xl">Hello, {account.name}</h1>
          <p className="text-sm text-muted-foreground">Your orders and details are stored on this device. Call {BUSINESS.phone} for any help.</p>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold">Your details</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Mobile number" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button onClick={saveProfile}>Save details</Button>
      </section>

      <section className="space-y-3">
        <SectionHeading title="Your orders" subtitle="Every order placed from this device" />
        {state.orders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            No orders yet. <Link to="/shop" className="text-primary underline">Start shopping</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {state.orders.map((o) => (
              <Link
                key={o.id}
                to="/order/$id"
                params={{ id: o.id }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div>
                  <p className="font-semibold">{o.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("en-IN")} · {o.items.length} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatINR(o.total)}</p>
                  <p className="text-xs text-primary">{o.status}</p>
                </div>
              </Link>
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
