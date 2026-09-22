import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unlockManager } from "@/lib/manage.functions";

export const Route = createFileRoute("/manage-login")({
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
  const unlock = useServerFn(unlockManager);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await unlock({ data: { password } });
    setBusy(false);
    if (res.ok) await router.navigate({ to: "/manage" });
    else setError(true);
  }

  return (
    <div className="container-page grid place-items-center py-16">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-[var(--shadow-card)]">
        <span className="grid size-11 place-items-center rounded-2xl bg-surface text-primary">
          <Lock className="size-5" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Manager panel</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Enter the staff password to manage the catalogue, orders and customers.</p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="pw">Staff password</Label>
          <Input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
          />
          {error && <p className="text-sm text-destructive">Incorrect password. Please try again.</p>}
        </div>
        <Button type="submit" className="mt-5 w-full" disabled={busy || !password}>
          {busy ? "Checking…" : "Enter panel"}
        </Button>
      </form>
    </div>
  );
}
