import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { ListPager } from "@/components/manage/ListPager";
import { ExportCsvButton } from "@/components/manage/ExportCsvButton";
import { AddWholesalerDialog } from "@/components/manage/AddWholesalerDialog";
import { TradeApprovalDriftAlert } from "@/components/manage/TradeApprovalDriftAlert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/catalog";
import { categoriesQuery } from "@/lib/queries";
import {
  addLedgerEntry,
  applyCategoryDiscount,
  addTradeInternalNote,
  createTradeAccountManually,
  decideTradeApplication,
  listTradeApplications,
  outstandingReport,
  setTradeTerms,
} from "@/lib/trade-admin.functions";
import { vendorDashboard } from "@/lib/vendor-payments.functions";
import { MANAGE_QUERY_OPTIONS } from "@/lib/manage-query";
import { exportTradeApplicationsCsv, exportTradeOutstandingCsv } from "@/lib/manage-exports.functions";
import { can } from "@/lib/staff-permissions";

export const Route = createFileRoute("/manage/trade")({ component: TradeAdmin });

const FILTERS = [
  { id: "pending", label: "Waiting" },
  { id: "more_info_needed", label: "Asked for papers" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
] as const;

function TradeAdmin() {
  const { staff } = Route.useRouteContext();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");
  const [page, setPage] = useState(0);
  const [outstandingPage, setOutstandingPage] = useState(0);
  const { data: applications, isPending, isFetching } = useQuery({
    queryKey: ["trade-applications", filter, page],
    queryFn: () => listTradeApplications({ data: { status: filter, page } }),
    placeholderData: (previous) => previous,
    ...MANAGE_QUERY_OPTIONS,
  });
  const { data: outstanding, isFetching: outstandingFetching } = useQuery({
    queryKey: ["trade-outstanding", outstandingPage],
    queryFn: () => outstandingReport({ data: { page: outstandingPage } }),
    placeholderData: (previous) => previous,
    ...MANAGE_QUERY_OPTIONS,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["trade-applications"] });
    await qc.invalidateQueries({ queryKey: ["trade-outstanding"] });
  };

  return (
    <div className="space-y-8">
      <TradeApprovalDriftAlert />
      <div className="flex justify-end"><AddWholesalerDialog onDone={async () => refresh()} /></div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Trade applications</h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => { setFilter(f.id); setPage(0); }}>
              {f.label}
            </Button>
          ))}
          {can(staff.role, "reports") && <ExportCsvButton dateRange onExport={(range) => exportTradeApplicationsCsv({ data: { status: filter, ...range } })} />}
        </div>

        {isPending ? (
          <SparkCharge compact label="Loading trade applications…" />
        ) : (applications?.items ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing here right now.
          </p>
        ) : (
          (applications?.items ?? []).map((a) => <ApplicationCard key={a.id} app={a} onDone={refresh} />)
        )}
        <ListPager page={page} total={applications?.total ?? 0} busy={isFetching} onPage={setPage} />
      </section>

      <CategoryPricing />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl font-semibold">Money owed</h2>{can(staff.role, "reports") && <ExportCsvButton dateRange onExport={(range) => exportTradeOutstandingCsv({ data: range })} />}</div>
        {(outstanding?.items ?? []).length === 0 ? (
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
                {(outstanding?.items ?? []).map((r) => (
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
        <ListPager page={outstandingPage} total={outstanding?.total ?? 0} busy={outstandingFetching} onPage={setOutstandingPage} />
      </section>
    </div>
  );
}

function PaymentBox({ profileId, onDone }: { profileId: string; onDone: () => Promise<void> }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"cash" | "upi_qr" | "bank_transfer" | "wholesaler_adjustment" | "other">("cash");
  const [reference, setReference] = useState("");
  const [receivedOn, setReceivedOn] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: vendorData } = useQuery({ queryKey: ["vendor-dashboard"], queryFn: () => vendorDashboard() });
  const needsReference = method === "upi_qr" || method === "bank_transfer" || method === "wholesaler_adjustment";
  return (
    <div className="grid min-w-64 gap-2 sm:grid-cols-2">
      <Input
        className="h-9"
        inputMode="decimal"
        placeholder="Amount"
        aria-label="Payment received"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={method} onChange={(e) => { setMethod(e.target.value as typeof method); setVendorId(""); }} aria-label="Payment method">
        <option value="cash">Cash</option><option value="upi_qr">UPI / QR</option><option value="bank_transfer">Bank transfer</option><option value="wholesaler_adjustment">Wholesaler adjustment</option><option value="other">Other</option>
      </select>
      <Input type="date" className="h-9" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} aria-label="Payment date" />
      <Input className="h-9" placeholder={needsReference ? "Reference / reason" : "Reference (optional)"} value={reference} onChange={(e) => setReference(e.target.value)} aria-label="Payment reference" />
      {method === "upi_qr" && <select className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:col-span-2" value={vendorId} onChange={(e) => setVendorId(e.target.value)} aria-label="UPI payment destination"><option value="">Paid to our own UPI</option>{vendorData?.vendors.filter((vendor) => vendor.active).map((vendor) => <option key={vendor.id} value={vendor.id}>Paid to {vendor.name}</option>)}</select>}
      <Button
        className="sm:col-span-2"
        size="sm"
        variant="outline"
        disabled={busy || !amount || (needsReference && !reference.trim())}
        onClick={async () => {
          setBusy(true);
          const res = await addLedgerEntry({ data: { profileId, kind: "payment", amount: Number(amount), method, reference, receivedOn, vendorId } });
          setBusy(false);
          if (!res.ok) return toast.error(res.error ?? "Could not save that");
          setAmount("");
          setReference("");
          setVendorId("");
          toast.success("Payment recorded");
          await onDone();
        }}
      >
        {busy ? <SparkRing /> : null}{busy ? "Recording…" : "Received"}
      </Button>
    </div>
  );
}

type App = Awaited<ReturnType<typeof listTradeApplications>>["items"][number];

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
    await new Promise((resolve) => setTimeout(resolve, 900));
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
          <h3 className="font-semibold">
            {app.businessName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {app.contactPerson} · {app.phone}{app.alternatePhone ? ` · Alt: ${app.alternatePhone}` : ""} · {app.status}
          </p>
          <p className="text-sm text-muted-foreground">{app.shopAddress}</p>
          <p className="text-xs text-muted-foreground">GSTIN {app.gstin ?? "—"} · PAN {app.pan ?? "—"}</p>
          {app.monthlyVolume && (
            <span className="mt-1.5 inline-flex rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {app.monthlyVolume} / month
            </span>
          )}
          {(app.businessType || app.yearsInBusiness || app.staffCount) && (
            <p className="mt-1 text-sm">
              {[app.businessType, app.yearsInBusiness && `${app.yearsInBusiness} in business`, app.staffCount && `${app.staffCount} staff`].filter(Boolean).join(" · ")}
            </p>
          )}
          {app.brands.length > 0 && <p className="text-xs text-muted-foreground">Brands: {app.brands.join(", ")}</p>}
          {app.partCategories.length > 0 && <p className="text-xs text-muted-foreground">Needs: {app.partCategories.join(", ")}</p>}
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

      <NotesPanel app={app} onDone={onDone} />

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
        {busy ? <SparkRing /> : null} Apply to category
      </Button>
    </section>
  );
}

function NotesPanel({ app, onDone }: { app: App; onDone: () => Promise<void> }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
      <h4 className="text-sm font-semibold">Internal notes <span className="font-normal text-muted-foreground">(staff only)</span></h4>
      {app.notes.map((n) => (
        <p key={n.id} className="text-xs"><span className="font-semibold">{n.author || "Staff"}</span>{" "}
          <span className="text-muted-foreground">{new Date(n.createdAt).toLocaleString("en-IN")}</span><br />{n.body}</p>
      ))}
      <div className="flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note for the team" aria-label="Internal note" />
        <Button size="sm" variant="outline" disabled={busy || !body.trim()} onClick={async () => {
          setBusy(true);
          const res = await addTradeInternalNote({ data: { id: app.id, body } });
          setBusy(false);
          if (!res.ok) return toast.error("Could not save the note");
          setBody(""); await onDone();
        }}>Add</Button>
      </div>
    </div>
  );
}
