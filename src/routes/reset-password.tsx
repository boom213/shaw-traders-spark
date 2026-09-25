import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { canonical } from "@/lib/catalog";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Shaw Traders EV" },
      { name: "description", content: "Choose a new password for your Shaw Traders EV customer account." },
      { property: "og:title", content: "Reset Password — Shaw Traders EV" },
      { property: "og:description", content: "Choose a new password for your Shaw Traders EV customer account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/reset-password") }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const recovery = window.location.hash.includes("type=recovery") || new URLSearchParams(window.location.search).get("type") === "recovery";
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session) || recovery));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    setComplete(true);
    toast.success("Password updated");
  };

  return (
    <section className="container-page grid min-h-[64vh] place-items-center py-12 sm:py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-lift)] sm:p-8">
        <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground">
          {complete ? <CheckCircle2 className="size-5" /> : <KeyRound className="size-5" />}
        </span>
        {complete ? (
          <>
            <h1 className="mt-4 font-display text-2xl font-semibold">Your password is ready</h1>
            <p className="mt-2 text-sm text-muted-foreground">You can now continue to your account and shop securely.</p>
            <Button className="mt-6 w-full" onClick={() => void navigate({ to: "/account" })}>Continue to account</Button>
          </>
        ) : ready ? (
          <>
            <h1 className="mt-4 font-display text-2xl font-semibold">Choose a new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">Use at least 8 characters that you do not use elsewhere.</p>
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-2xl font-semibold">This reset link is not active</h1>
            <p className="mt-2 text-sm text-muted-foreground">Request a fresh password link from the account page.</p>
            <Button className="mt-6 w-full" variant="outline" asChild><Link to="/account">Back to sign in</Link></Button>
          </>
        )}
      </div>
    </section>
  );
}