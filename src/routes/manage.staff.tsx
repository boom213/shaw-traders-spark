import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionHeading } from "@/components/site/Empty";
import { inviteStaff, listStaff, recentAudit, revokeStaff, staffSession } from "@/lib/staff.functions";

export const Route = createFileRoute("/manage/staff")({
  head: () => ({ meta: [{ title: "Staff — Shaw Traders EV Manager" }, { name: "robots", content: "noindex" }] }),
  component: StaffPage,
});

const ROLES = ["staff", "manager", "owner"] as const;

function StaffPage() {
  const qc = useQueryClient();
  const session = useServerFn(staffSession);
  const list = useServerFn(listStaff);
  const invite = useServerFn(inviteStaff);
  const revoke = useServerFn(revokeStaff);
  const audit = useServerFn(recentAudit);

  const { data: me } = useQuery({ queryKey: ["staff-session"], queryFn: () => session() });
  const { data: team, isPending } = useQuery({ queryKey: ["staff-list"], queryFn: () => list() });
  const { data: activity } = useQuery({ queryKey: ["staff-audit"], queryFn: () => audit() });

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("staff");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const isOwner = me?.signedIn && me.role === "owner";

  const inviteMutation = useMutation({
    mutationFn: () => invite({ data: { email, name, role } }),
    onSuccess: (res) => {
      if ("error" in res && res.error) return toast.error(res.error);
      setTempPassword(("tempPassword" in res && res.tempPassword) || null);
      setEmail("");
      setName("");
      toast.success("Access granted");
      void qc.invalidateQueries({ queryKey: ["staff-list"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (profileId: string) => revoke({ data: { profileId } }),
    onSuccess: (res) => {
      if ("error" in res && res.error) return toast.error(res.error);
      toast.success("Access removed");
      void qc.invalidateQueries({ queryKey: ["staff-list"] });
    },
  });

  return (
    <div className="space-y-8">
      <SectionHeading title="Staff access" subtitle="Who can open this panel" />

      {isOwner && (
        <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-lg font-semibold">Invite someone</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-role">Role</Label>
              <select
                id="s-role"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={inviteMutation.isPending || !email || name.trim().length < 2}
                onClick={() => inviteMutation.mutate()}
              >
                Give access
              </Button>
            </div>
          </div>
          {tempPassword && (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm">
              Share this one-time password with them: <strong>{tempPassword}</strong>. They should change it after signing in.
            </p>
          )}
        </section>
      )}

      <section className="space-y-3">
        {isPending ? (
          <div className="grid gap-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : (
          (team ?? []).map((m) => (
            <div
              key={m.profileId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {m.name} {m.isYou && <span className="text-xs text-muted-foreground">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.email} · {m.role} · since {new Date(m.since).toLocaleDateString("en-IN")}
                </p>
              </div>
              {isOwner && !m.isYou && (
                <Button variant="outline" size="sm" onClick={() => revokeMutation.mutate(m.profileId)}>
                  Remove access
                </Button>
              )}
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <SectionHeading title="Recent changes" subtitle="Every catalogue, price, stock and order update" />
        <div className="space-y-2">
          {(activity ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
              No changes recorded yet.
            </p>
          ) : (
            (activity ?? []).map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-card p-3 text-sm">
                <p className="font-medium">{a.action}</p>
                <p className="text-xs text-muted-foreground">
                  {a.actor} · {new Date(a.at).toLocaleString("en-IN")}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
