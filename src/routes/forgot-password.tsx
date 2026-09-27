import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, LockKeyhole, Mail, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SparkRing } from "@/components/site/SparkLoaders";
import { supabase } from "@/integrations/supabase/client";
import { canonical } from "@/lib/catalog";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — Shaw Traders EV" },
      { name: "description", content: "Request a secure password-reset link for your Shaw Traders EV account." },
      { property: "og:title", content: "Forgot Password — Shaw Traders EV" },
      { property: "og:description", content: "Request a secure password-reset link for your Shaw Traders EV account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/forgot-password") }],
  }),
  component: ForgotPasswordPage,
});

const benefits = [
  "Secure and fast password reset",
  "Get back to your account in minutes",
  "Keep your data safe with us",
];

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const submittedEmail = email.trim();
    if (!submittedEmail) return toast.error("Enter your email address");
    if (!/^\S+@\S+\.\S+$/.test(submittedEmail)) return toast.error("Enter a valid email address");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(submittedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSentEmail(submittedEmail);
    toast.success("Password reset link sent");
  };

  return (
    <section className="container-page py-10 sm:py-14 lg:py-20">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)] lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative overflow-hidden border-b border-border bg-surface px-6 py-10 sm:px-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-accent/60" />
          <div className="relative">
            <div className="relative mx-auto grid size-32 place-items-center sm:size-36 lg:mx-0">
              <span className="absolute inset-0 rounded-full bg-accent" />
              <LockKeyhole className="relative size-16 text-primary sm:size-20" strokeWidth={1.7} />
              <span className="absolute bottom-2 right-1 grid size-11 place-items-center rounded-full border-4 border-surface bg-primary text-primary-foreground shadow-card">
                <RefreshCw className="size-5" />
              </span>
              <Sparkles className="absolute right-0 top-2 size-6 text-primary" />
            </div>
            <h1 className="mt-7 text-center font-display text-3xl font-semibold sm:text-4xl lg:text-left">Forgot Your Password?</h1>
            <p className="mt-3 max-w-md text-center text-sm leading-6 text-muted-foreground sm:text-base lg:text-left">
              No worries! Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
            <ul className="mt-7 space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3 text-sm text-foreground">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-5 sm:p-8 lg:p-10">
          <div className="flex min-h-full flex-col justify-center rounded-xl border border-border bg-background p-5 sm:p-8">
            {sentEmail ? (
              <div className="text-center" aria-live="polite">
                <span className="mx-auto grid size-14 place-items-center rounded-xl bg-accent text-accent-foreground"><CheckCircle2 className="size-7" /></span>
                <h2 className="mt-5 font-display text-2xl font-semibold">Check your email</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Check your email at <strong className="font-semibold text-foreground">{sentEmail}</strong> for a link to reset your password.
                </p>
                <Button type="button" variant="outline" className="mt-7 w-full" onClick={() => setSentEmail(null)}>Use a different email</Button>
              </div>
            ) : (
              <>
                <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-foreground"><Mail className="size-5" /></span>
                <h2 className="mt-5 font-display text-2xl font-semibold">Reset Your Password</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter the email address associated with your account and we&apos;ll send you a reset link.</p>
                <form className="mt-7 space-y-5" onSubmit={submit} noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="reset-email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" className="h-11 pl-9" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
                    </div>
                  </div>
                  <Button type="submit" className="h-11 w-full" disabled={busy}>
                    {busy ? <SparkRing /> : <Send />}{busy ? "Sending…" : "Send Reset Link"}
                  </Button>
                </form>
                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
                <Button variant="outline" className="w-full" asChild><Link to="/account"><ArrowLeft />Back to Sign In</Link></Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}