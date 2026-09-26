import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bike, CheckCircle2, Eye, EyeOff, LogOut, Mail, MapPin, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PhoneOtpForm } from "@/components/site/PhoneOtpForm";
import { ProductCard } from "@/components/site/ProductCard";
import { SectionHeading } from "@/components/site/Empty";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { AddressFields, EMPTY_ADDRESS, validateCustomerAddress, type CustomerAddressInput } from "@/components/site/AddressFields";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { myOrders } from "@/lib/orders.functions";
import { bookingsByUser } from "@/lib/booking.functions";
import { reorderItems } from "@/lib/trade.functions";
import { BUSINESS, canonical, formatINR, statusLabel } from "@/lib/catalog";
import { productsByIdsQuery } from "@/lib/queries";
import { bookingStatusLabel } from "@/lib/vehicles";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Sign In / Register — Shaw Traders EV" },
      { name: "description", content: "Create your free account or sign in with email, Google or mobile. Track orders and save EV parts at Shaw Traders EV." },
      { property: "og:title", content: "Sign In / Register — Shaw Traders EV" },
      { property: "og:description", content: "Create your free account or sign in with email, Google or mobile. Track orders and save EV parts at Shaw Traders EV." },
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
  if (!authReady) return <div className="container-page"><SparkCharge label="Loading your account…" /></div>;
  return user ? <Dashboard /> : <AuthPanel />;
}

function AuthPanel() {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [emailSent, setEmailSent] = useState(false);
  const [showMobile, setShowMobile] = useState(false);

  const emailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email address");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("You're signed in");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.session) return toast.success("Your account is ready");
    setEmailSent(true);
  };

  const forgotPassword = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter your email address first");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent");
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/account${window.location.search}` });
    if (result.redirected) return;
    setBusy(false);
    if (result.error) return toast.error(result.error.message || "Google sign-in failed");
    toast.success("You're signed in");
  };


  return (
    <div className="container-page grid place-items-center py-10 sm:py-14">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
          <UserRound className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold">Welcome to Shaw Traders EV</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in or create an account to track orders and keep your saved parts together.
        </p>

        {emailSent ? (
          <div className="mt-6 rounded-lg border border-primary/30 bg-accent p-5 text-center">
            <CheckCircle2 className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-semibold">Check your email</h2>
            <p className="mt-1 text-sm text-muted-foreground">Open the confirmation link sent to {email}. Then return here to sign in.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setEmailSent(false); setMode("signin"); }}>Back to sign in</Button>
          </div>
        ) : (
          <Tabs value={mode} onValueChange={(value) => setMode(value as "signin" | "signup")} className="mt-6">
            <TabsList className="grid h-11 w-full grid-cols-2">
              <TabsTrigger value="signin" className="h-9">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="h-9">Create account</TabsTrigger>
            </TabsList>
            {(["signin", "signup"] as const).map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-5">
                <form className="space-y-4" onSubmit={emailAuth}>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${tab}-email`}>Email address</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id={`${tab}-email`} type="email" autoComplete="email" className="h-11 pl-9" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`${tab}-password`}>Password</Label>
                    <div className="relative"><Input id={`${tab}-password`} type={showPassword ? "text" : "password"} autoComplete={tab === "signin" ? "current-password" : "new-password"} className="h-11 pr-10" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-9" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((shown) => !shown)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div>
                    {tab === "signup" && <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
                  </div>
                  {tab === "signin" && <Button type="button" variant="link" className="h-auto p-0 text-xs" disabled={busy} onClick={() => void forgotPassword()}>Forgot password?</Button>}
                  <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? <SparkRing /> : null}{busy ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}</Button>
                </form>
              </TabsContent>
            ))}
          </Tabs>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void google()}>
          Continue with Google
        </Button>
        <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => setShowMobile((shown) => !shown)}>
          {showMobile ? "Hide mobile sign-in" : "Use mobile number instead"}
        </Button>
        {showMobile && (
          <div className="mt-4 rounded-lg border border-border bg-surface p-4">
            <p className="mb-3 text-xs text-muted-foreground">Text-message sign-in may be temporarily unavailable. You can still use email or Google.</p>
            <PhoneOtpForm idPrefix="account" />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-muted-foreground">Garage, mechanic, or fleet dealer? Looking for trade pricing and bulk order terms?</p>
          <Link to="/trade" className="mt-1.5 inline-flex min-h-10 items-center font-semibold text-foreground underline-offset-4 hover:underline">
            Register for a Wholesale Account →
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const mobile = user?.phone ? `+${String(user.phone).replace(/\D/g, "")}` : "";
  const providers = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : [];
  const hasEmailPassword = providers.includes("email");
  const loadBookings = useServerFn(bookingsByUser);

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

  const { data: bookings, isPending: bookingsPending } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: () => loadBookings(),
    enabled: Boolean(user),
  });

  const ids = Array.from(new Set([...lists.wishlist, ...lists.saved, ...lists.recentlyViewed]));
  const { data: products } = useQuery(productsByIdsQuery(ids));
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const wishlist = lists.wishlist.map((id) => byId.get(id)).filter(Boolean);
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

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) return toast.error("Your account does not have an email address");
    if (newPassword.length < 8) return toast.error("New password must be at least 8 characters");
    if (newPassword !== confirmPassword) return toast.error("New passwords do not match");

    setUpdatingPassword(true);
    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verificationError) {
      setUpdatingPassword(false);
      const invalidPassword = /invalid.*(credential|login)|password/i.test(verificationError.message);
      return toast.error(invalidPassword ? "Current password is incorrect" : "Could not verify your current password. Please try again.");
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);
    if (updateError) return toast.error(`Could not update password: ${updateError.message}`);

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  if (!user) return null;

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

      <section id="details" className="scroll-mt-52 space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold">Your details</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input value={mobile} readOnly aria-label="Mobile number" />
          <Input placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button disabled={saving} onClick={() => void saveProfile()}>Save details</Button>

        {hasEmailPassword && (
          <form className="space-y-4 border-t border-border pt-5" onSubmit={changePassword}>
            <div>
              <h3 className="font-semibold">Change password</h3>
              <p className="mt-1 text-sm text-muted-foreground">Enter your current password before choosing a new one.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password">Confirm new password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>
            <Button type="submit" disabled={updatingPassword}>
              {updatingPassword && <SparkRing />}
              {updatingPassword ? "Updating…" : "Update password"}
            </Button>
          </form>
        )}
      </section>

      <AddressBook userId={user.id} />

      <section id="orders" className="scroll-mt-52 space-y-3">
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

      <section id="bookings" className="scroll-mt-52 space-y-3">
        <SectionHeading title="My Bookings" subtitle="Track your electric scooter bookings" />
        {bookingsPending ? (
          <div className="grid gap-2">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : !bookings || bookings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            No scooter bookings yet. <Link to="/scooters" className="text-primary underline">Browse electric scooters</Link>
          </p>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Link
                key={booking.token}
                to="/booking/$token"
                params={{ token: booking.token }}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-primary"><Bike className="size-5" /></span>
                  <div>
                    <p className="font-semibold">{booking.modelName}</p>
                    <p className="text-xs text-muted-foreground">{booking.humanId} · {bookingStatusLabel(booking.status)}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p><span className="text-muted-foreground">Token:</span> <strong>{formatINR(booking.tokenAmount)}</strong></p>
                  <p className="text-xs text-muted-foreground">Balance {formatINR(booking.balanceDue)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="wishlist" className="scroll-mt-52 space-y-3">
        <SectionHeading title="Your wishlist" subtitle="Parts you want to keep for later" />
        {wishlist.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {wishlist.map((p) => p && <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
            Your wishlist is empty. <Link to="/shop" className="font-medium text-primary underline">Browse products</Link>
          </p>
        )}
      </section>

      {saved.length > 0 && (
        <section className="space-y-3">
          <SectionHeading title="Saved from your cart" />
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

type SavedAddress = {
  id: string;
  name: string | null;
  phone: string | null;
  alternate_phone: string | null;
  line1: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_default: boolean;
};

function AddressBook({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerAddressInput>(EMPTY_ADDRESS);
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<SavedAddress | null>(null);

  const { data: addresses = [], isPending } = useQuery({
    queryKey: ["my-addresses", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("id, name, phone, alternate_phone, line1, landmark, city, state, pincode, is_default")
        .eq("profile_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SavedAddress[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["my-addresses", userId] });
  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_ADDRESS);
    setMakeDefault(addresses.length === 0);
    setDialogOpen(true);
  };
  const openEdit = (address: SavedAddress) => {
    setEditingId(address.id);
    setForm({
      name: address.name ?? "",
      phone: address.phone ?? "",
      alternatePhone: address.alternate_phone ?? "",
      line1: address.line1 ?? "",
      landmark: address.landmark ?? "",
      city: address.city ?? "",
      state: address.state ?? "West Bengal",
      pincode: address.pincode ?? "",
    });
    setMakeDefault(address.is_default);
    setDialogOpen(true);
  };
  const save = async () => {
    const validationError = validateCustomerAddress(form);
    if (validationError) return toast.error(validationError);
    setSaving(true);
    if (makeDefault) {
      const { error } = await supabase.from("addresses").update({ is_default: false }).eq("profile_id", userId).eq("is_default", true);
      if (error) {
        setSaving(false);
        return toast.error("Could not update your default address");
      }
    }
    const row = {
      profile_id: userId,
      name: form.name.trim(),
      phone: form.phone,
      alternate_phone: form.alternatePhone || null,
      line1: form.line1.trim(),
      landmark: form.landmark.trim() || null,
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode,
      is_default: makeDefault,
    };
    const result = editingId
      ? await supabase.from("addresses").update(row).eq("id", editingId).eq("profile_id", userId)
      : await supabase.from("addresses").insert(row);
    setSaving(false);
    if (result.error) return toast.error("Could not save this address");
    setDialogOpen(false);
    await refresh();
    toast.success(editingId ? "Address updated" : "Address saved");
  };
  const setDefault = async (id: string) => {
    const clear = await supabase.from("addresses").update({ is_default: false }).eq("profile_id", userId).eq("is_default", true);
    if (clear.error) return toast.error("Could not update your default address");
    const result = await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("profile_id", userId);
    if (result.error) return toast.error("Could not update your default address");
    await refresh();
    toast.success("Default address updated");
  };
  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("addresses").delete().eq("id", deleting.id).eq("profile_id", userId);
    if (error) return toast.error("Could not delete this address");
    setDeleting(null);
    await refresh();
    toast.success("Address deleted");
  };

  return (
    <section id="addresses" className="scroll-mt-52 space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Addresses</h2>
          <p className="text-sm text-muted-foreground">Manage delivery addresses for faster checkout.</p>
        </div>
        <Button onClick={openNew}><Plus className="size-4" /> Add new address</Button>
      </div>
      {isPending ? <div className="py-4"><SparkRing /> <span className="text-sm text-muted-foreground">Loading addresses…</span></div> : addresses.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">You have no saved addresses yet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {addresses.map((address) => (
            <article key={address.id} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-semibold">{address.name}</p>
                    <p className="text-sm text-muted-foreground">{address.phone}{address.alternate_phone ? ` · Alt: ${address.alternate_phone}` : ""}</p>
                  </div>
                </div>
                {address.is_default && <span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground">Default</span>}
              </div>
              <p className="text-sm text-muted-foreground">{[address.line1, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(address)}><Pencil className="size-3.5" /> Edit</Button>
                {!address.is_default && <Button size="sm" variant="outline" onClick={() => void setDefault(address.id)}>Set as default</Button>}
                <Button size="sm" variant="ghost" aria-label={`Delete address for ${address.name ?? "customer"}`} onClick={() => setDeleting(address)}><Trash2 className="size-3.5" /> Delete</Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit address" : "Add new address"}</DialogTitle>
            <DialogDescription>Save an address you can select during checkout.</DialogDescription>
          </DialogHeader>
          <AddressFields value={form} onChange={setForm} />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={makeDefault} onCheckedChange={(checked) => setMakeDefault(checked === true)} />
            Make this my default address
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => void save()}>{saving && <SparkRing />}{saving ? "Saving…" : "Save address"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>This saved address will be permanently removed. Existing orders will not be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Delete address</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
