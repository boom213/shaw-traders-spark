import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { claimFirstOwner, recordStaffSignIn, staffBootstrapNeeded, staffSignInAllowed } from "@/lib/staff.functions";

export const Route = createFileRoute("/manage-login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In — Shaw Traders EV Manager" },
      { name: "description", content: "Staff-only sign in for the Shaw Traders EV manager panel." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Staff Sign In — Shaw Traders EV" },
      { property: "og:description", content: "Manager panel access for Shaw Traders EV staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageLogin,
});

function ManageLogin() {
  const router = useRouter();
  const allowed = useServerFn(staffSignInAllowed);
  const record = useServerFn(recordStaffSignIn);
  const claim = useServerFn(claimFirstOwner);
  const bootstrap = useServerFn(staffBootstrapNeeded);

  const { data: setup, refetch } = useQuery({ queryKey: ["staff-bootstrap"], queryFn: () => bootstrap() });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const gate = await allowed({ data: { email } });
    if (!gate.allowed) {
      setBusy(false);
      setError(
        gate.waitMinutes
          ? `Too many failed attempts. Try again in about ${gate.waitMinutes} minute(s).`
          : "Enter your staff email address.",
      );
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    await record({ data: { email, ok: !authError } });
    setBusy(false);
    if (authError) {
      setError("That email and password do not match a staff account.");
      return;
    }
    await router.navigate({ to: "/manage" });
  }

  async function createOwner(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await claim({ data: { email, password, name } });
    if ("error" in res && res.error) {
      setBusy(false);
      setError(res.error);
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) {
      toast.success("Owner account created. Please sign in.");
      await refetch();
      return;
    }
    await router.navigate({ to: "/manage" });
  }

  const firstRun = setup?.needed === true;

  return (
    <div className="container-page grid place-items-center py-16">
      <form
        onSubmit={firstRun ? createOwner : signIn}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)]"
      >
        <span className="grid size-11 place-items-center rounded-2xl bg-surface text-primary">
          <Lock className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">{firstRun ? "Create owner account" : "Manager panel"}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {firstRun
            ? "No staff account exists yet. Create the owner account to manage the catalogue, orders and customers."
            : "Sign in with your staff account to manage the catalogue, orders and customers."}
        </p>

        <div className="mt-5 space-y-3">
          {firstRun && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Password</Label>
            <Input
              id="pw"
              type="password"
              autoComplete={firstRun ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <Button type="submit" className="mt-5 w-full" disabled={busy || !email || !password}>
          {busy ? "Checking…" : firstRun ? "Create owner account" : "Enter panel"}
        </Button>
      </form>
    </div>
  );
}
