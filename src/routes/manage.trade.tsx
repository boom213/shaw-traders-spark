import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/catalog";
import { categoriesQuery } from "@/lib/queries";
import {
  addLedgerEntry,
  applyCategoryDiscount,
  decideTradeApplication,
  listTradeApplications,
  outstandingReport,
  setTradeTerms,
} from "@/lib/trade-admin.functions";

export const Route = createFileRoute("/manage/trade")({ component: TradeAdmin });

const FILTERS = [
  { id: "pending", label: "Waiting" },
  { id: "more_info_needed", label: "Asked for papers" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
] as const;

function TradeAdmin() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");
  const { data: applications, isPending } = useQuery({
    queryKey: ["trade-applications", filter],
    queryFn: () => listTradeApplications({ data: { status: filter } }),
  });
  const { data: outstanding } = useQuery({ queryKey: ["trade-outstanding"], queryFn: () => outstandingReport() });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["trade-applications"] });
    await qc.invalidateQueries({ queryKey: ["trade-outstanding"] });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Trade applications</h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => setFilter(f.id)}>
              {f.label}
            </Button>
          ))}
        </div>

        {isPending ? (
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        ) : (applications ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing here right now.
          </p>
        ) : (
          (applications ?? []).map((a) => <ApplicationCard key={a.id} app={a} onDone={refresh} />)
        )}
      </section>

      <CategoryPricing />

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Money owed</h2>
        {(outstanding ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nobody owes anything at the moment.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">Outstanding balances, oldest unpaid bill first</caption>
              <thead className="bg-surface text-left">
                <tr>
                  <th scope="col" className="px-3 py-2">Customer</th>
                  <th scope="col" className="px-3 py-2">Owes</th>
                  <th scope="col" className="px-3 py-2">Limit</th>
                  <th scope="col" className="px-3 py-2">Oldest bill due</th>
                  <th scope="col" className="px-3 py-2">Record payment</th>
                </tr>
              </thead>
              <tbody>
                {(outstanding ?? []).map((r) => (
                  <tr key={r.profileId} className={`border-t border-border ${r.overdue ? "bg-destructive/5" : ""}`}>
                    <td className="px-3 py-2">
                      {r.name}
                      {r.phone ? <span className="block text-xs text-muted-foreground">{r.phone}</span> : null}
                    </td>
                    <td className="px-3 py-2 font-semibold">{formatINR(r.balance)}</td>
                    <td className="px-3 py-2">{formatINR(r.creditLimit)}</td>
                    <td className="px-3 py-2">{r.oldestDue ?? "—"}{r.overdue ? " · overdue" : ""}</td>
                    <td className="px-3 py-2"><PaymentBox profileId={r.profileId} onDone={refresh} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function PaymentBox({ profileId, onDone }: { profileId: string; onDone: () => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Input
        className="h-9 w-28"
        inputMode="decimal"
        placeholder="Amount"
        aria-label="Payment received"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={busy || !amount}
        onClick={async () => {
          setBusy(true);
          const res = await addLedgerEntry({ data: { profileId, kind: "payment", amount: Number(amount) } });
          setBusy(false);
          if (!res.ok) return toast.error(res.error ?? "Could not save that");
          setAmount("");
          toast.success("Payment recorded");
          await onDone();
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : "Received"}
      </Button>
    </div>
  );
}

type App = Awaited<ReturnType<typeof listTradeApplications>>[number];

function ApplicationCard({ app, onDone }: { app: App; onDone: () => Promise<void> }) {
  const [note, setNote] = useState("");
  const [tier, setTier] = useState(app.tier === "retail" ? "trade" : app.tier);
  const [limit, setLimit] = useState(String(app.creditLimit));
  const [terms, setTerms] = useState(String(app.paymentTermsDays));
  const [busy, setBusy] = useState(false);

  const decide = async (decision: "approved" | "rejected" | "more_info_needed") => {
    setBusy(true);
    const res = await decideTradeApplication({ data: { id: app.id, decision, note, tier } });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not save that");
    toast.success("Saved — the customer has been told");
    await onDone();
  };

  const saveTerms = async () => {
    setBusy(true);
    const res = await setTradeTerms({
      data: { profileId: app.profileId, tier, creditLimit: Number(limit), paymentTermsDays: Number(terms) },
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Only a permanent admin can change credit terms");
    toast.success("Terms saved");
    await onDone();
  };

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{app.businessName}</h3>
          <p className="text-sm text-muted-foreground">
            {app.contactPerson} · {app.phone} · {app.status}
          </p>
          <p className="text-sm text-muted-foreground">{app.shopAddress}</p>
          <p className="text-xs text-muted-foreground">GSTIN {app.gstin ?? "—"} · PAN {app.pan ?? "—"}</p>
        </div>
        <div className="text-right text-sm">
          <p>Owes {formatINR(app.balance)}{app.overdue ? " · overdue" : ""}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {app.documents.map((d) =>
          d.url ? (
            <a
              key={d.label}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-surface"
              href={d.url}
              target="_blank"
              rel="noreferrer"
            >
              {d.label} <ExternalLink className="size-3" />
            </a>
          ) : (
            <span key={d.label} className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
              {d.label}: missing
            </span>
          ),
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm">
          Rate card
          <select className="mt-1 h-10 w-full rounded-md border border-border bg-background px-2" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="trade">Trade</option>
            <option value="distributor">Distributor</option>
            <option value="retail">Retail</option>
          </select>
        </label>
        <label className="text-sm">
          Credit limit
          <Input className="mt-1" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </label>
        <label className="text-sm">
          Payment days
          <Input className="mt-1" inputMode="numeric" value={terms} onChange={(e) => setTerms(e.target.value)} />
        </label>
      </div>

      <Textarea
        rows={2}
        placeholder="Reason, or the exact document you need"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => decide("approved")}>Approve</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("more_info_needed")}>Ask for a document</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide("rejected")}>Reject</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={saveTerms}>Save credit terms</Button>
      </div>
    </article>
  );
}

function CategoryPricing() {
  const { data: categories } = useQuery(categoriesQuery());
  const [categorySlug, setCategorySlug] = useState("");
  const [tier, setTier] = useState("trade");
  const [percent, setPercent] = useState("10");
  const [minQty, setMinQty] = useState("1");
  const [busy, setBusy] = useState(false);

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-display text-xl font-semibold">Wholesale rates by category</h2>
      <p className="text-sm text-muted-foreground">
        Set a whole category at a percentage below the retail price, instead of typing each part.
      </p>
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="text-sm">
          Category
          <select className="mt-1 h-10 w-full rounded-md border border-border bg-background px-2" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
            <option value="">Choose…</option>
            {(categories ?? []).map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Rate card
          <select className="mt-1 h-10 w-full rounded-md border border-border bg-background px-2" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="trade">Trade</option>
            <option value="distributor">Distributor</option>
          </select>
        </label>
        <label className="text-sm">
          Percent off
          <Input className="mt-1" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
        </label>
        <label className="text-sm">
          From quantity
          <Input className="mt-1" inputMode="numeric" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
        </label>
      </div>
      <Button
        disabled={busy || !categorySlug}
        onClick={async () => {
          setBusy(true);
          const res = await applyCategoryDiscount({ data: { categorySlug, tier, percent: Number(percent), minQty: Number(minQty) } });
          setBusy(false);
          if (!res.ok) return toast.error(res.error ?? "Only a permanent admin can change prices");
          toast.success(`${res.updated} parts priced`);
        }}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null} Apply to category
      </Button>
    </section>
  );
}
