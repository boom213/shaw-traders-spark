import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Check, Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneOtpForm } from "@/components/site/PhoneOtpForm";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { BUSINESS, canonical, formatINR } from "@/lib/catalog";
import { lovable } from "@/integrations/lovable/index";
import { uploadTradeDoc } from "@/lib/trade-upload";
import { checkTradeDocument, myDocChecks } from "@/lib/trade-ai.functions";
import type { DocCheck } from "@/lib/trade-ai.server";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectDropdown } from "@/components/site/MultiSelectDropdown";
import { categoriesQuery } from "@/lib/queries";
import { BUSINESS_TYPES, EV_BRANDS, STAFF_OPTIONS, VOLUME_OPTIONS, YEARS_OPTIONS, taxIdError } from "@/lib/trade-options";
import {
  DOC_FIELDS,
  deleteTradeDocument,
  myPriceList,
  myTradeAccount,
  submitTradeApplication,
  type TradeDocField,
} from "@/lib/trade.functions";

export const Route = createFileRoute("/trade")({
  head: () => ({
    meta: [
      { title: "Register for a Trade & Wholesale Account — Shaw Traders EV" },
      { name: "description", content: "Mechanics, garages and retailers: open a wholesale account with Shaw Traders EV for trade prices, bulk ordering and credit terms." },
      { property: "og:title", content: "Register for a Trade & Wholesale Account — Shaw Traders EV" },
      { property: "og:description", content: "Wholesale prices, bulk order pad and credit terms for EV workshops and retailers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: canonical("/trade") }],
  }),
  component: TradePage,
});

const STATUS_TEXT: Record<string, string> = {
  pending: "We have your papers and are checking them.",
  approved: "Your wholesale account is open.",
  rejected: "We could not open a wholesale account this time.",
  more_info_needed: "We need one more document from you.",
};

function TradePage() {
  const { user } = useStore();
  const qc = useQueryClient();
  const { data: account, isPending } = useQuery({ queryKey: ["trade-account"], queryFn: () => myTradeAccount() });

  const [form, setForm] = useState({
    businessName: "", gstin: "", pan: "", shopAddress: "", contactPerson: "", phone: "",
    businessType: "", yearsInBusiness: "", staffCount: "", monthlyVolume: "",
  });
  const [brands, setBrands] = useState<string[]>([]);
  const [partCategories, setPartCategories] = useState<string[]>([]);
  const { data: cats } = useQuery(categoriesQuery());
  const brandOptions = EV_BRANDS;
  const categoryOptions = (cats ?? []).map((c) => c.name);
  const [docs, setDocs] = useState<Partial<Record<TradeDocField, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [checks, setChecks] = useState<Record<string, DocCheck & { running?: boolean }>>({});
  useEffect(() => {
    if (!user) return;
    void myDocChecks().then((rows) => setChecks(Object.fromEntries(rows.map((c) => [c.field, c]))));
  }, [user?.id]);
  const runCheck = async (field: TradeDocField, path: string) => {
    setChecks((c) => ({ ...c, [field]: { field, status: "ok", extracted: {}, issues: [], checkedAt: "", running: true } }));
    try {
      const res = await checkTradeDocument({ data: { field, path, businessName: form.businessName, gstin: form.gstin, pan: form.pan } });
      setChecks((c) => { const n = { ...c }; if (res) n[field] = res; else delete n[field]; return n; });
    } catch {
      setChecks((c) => ({ ...c, [field]: { field, status: "error", extracted: {}, issues: ["AI check unavailable right now."], checkedAt: "" } }));
    }
  };

  useEffect(() => {
    const app = account?.application;
    if (!app) return;
    setForm({
      businessName: app.businessName,
      gstin: app.gstin ?? "",
      pan: app.pan ?? "",
      shopAddress: app.shopAddress,
      contactPerson: app.contactPerson,
      phone: app.phone,
      businessType: app.businessType,
      yearsInBusiness: app.yearsInBusiness,
      staffCount: app.staffCount,
      monthlyVolume: app.monthlyVolume,
    });
    setBrands(app.brands);
    setPartCategories(app.partCategories);
    setDocs(Object.fromEntries(Object.entries(app.documents).filter(([, v]) => v)) as Partial<Record<TradeDocField, string>>);
  }, [account?.application?.id, account?.application?.status]);

  const pick = async (field: TradeDocField, file: File | undefined) => {
    if (!file || !user) return;
    setBusy(field);
    try {
      const path = await uploadTradeDoc(user.id, field, file);
      setDocs((d) => ({ ...d, [field]: path }));
      toast.success("Document attached — checking it now");
      void runCheck(field, path);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload that file");
    }
    setBusy(null);
  };

  const removeDoc = async (field: TradeDocField) => {
    setBusy(field);
    await deleteTradeDocument({ data: { field } });
    setDocs((d) => ({ ...d, [field]: undefined }));
    setChecks((c) => { const n = { ...c }; delete n[field]; return n; });
    await qc.invalidateQueries({ queryKey: ["trade-account"] });
    setBusy(null);
    toast.success("Document removed");
  };

  const taxErr = taxIdError(form.gstin, form.pan, false);
  const submit = async () => {
    const err = taxIdError(form.gstin, form.pan);
    if (err) return toast.error(err);
    setSaving(true);
    const res = await submitTradeApplication({ data: { ...form, brands, partCategories, documents: docs } });
    setSaving(false);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    await qc.invalidateQueries({ queryKey: ["trade-account"] });
  };

  const downloadList = async () => {
    const res = await myPriceList();
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shaw-traders-price-list-${res.tier}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="container-page space-y-6 py-10">
        <SectionHeading
          as="h1"
          title="Register for a Trade & Wholesale Account"
          subtitle="For mechanics, garages, e-rickshaw workshops and retailers who buy EV parts regularly. Not a one-off order? Use Bulk Order Enquiry instead."
        />
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Step 1 of 2</p>
            <h2 className="mt-1 font-display text-lg font-semibold">Sign in to apply</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use your mobile number or Google. Once signed in, the business details form (step 2) opens right here on this page.</p>
          </div>
          <div>
            {/* TEMP: remove once Twilio SMS is confirmed working */}
            <div className="mb-4 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-foreground">
              Text-message sign-in is temporarily unavailable. Please use Continue with Google below, or call us at {BUSINESS.phone}.
            </div>
            <PhoneOtpForm idPrefix="trade" />
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/trade` });
                if (result.redirected) return;
                if (result.error) toast.error(result.error.message || "Google sign-in failed");
              }}
            >
              Continue with Google
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-lg font-semibold">What you get</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {["Trade prices on every part", "Bulk order pad — add many parts at once", "Credit terms once approved", "Your own downloadable price list", "Freight delivery by transport"].map((b) => (
                <li key={b} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{b}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display text-lg font-semibold">What you'll need</h2>
            <p className="mt-2 text-sm text-muted-foreground">Business name, contact person, GSTIN (if any), PAN and shop address, plus these papers (photo or PDF):</p>
            <ul className="mt-3 space-y-2 text-sm">
              {DOC_FIELDS.map((d) => (
                <li key={d.field} className="flex gap-2"><FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{d.label}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-semibold">How it works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>Sign in with your mobile number or Google.</li>
              <li>Fill in your shop details and attach the papers.</li>
              <li>We check them and open your account — you'll hear from us on WhatsApp.</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Your papers stay private — only our staff can open them.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" asChild><Link to="/bulk">One-off bulk enquiry</Link></Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const approved = account?.approved === true;
  const status = account?.application?.status;

  return (
    <div className="container-page space-y-6 py-10">
      <SectionHeading
        as="h1"
        title="Register for a Trade & Wholesale Account"
        subtitle="For mechanics, garages, e-rickshaw workshops and retailers. Wholesale rates, bulk ordering and account terms."
      />
      {!account?.application && !isPending && (
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Step 2 of 2 · Signed in{user?.phone ? ` as +${user.phone}` : user?.email ? ` as ${user.email}` : ""} — tell us about your business
        </p>
      )}

      {isPending ? (
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <>
          {status && (
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="font-semibold">{STATUS_TEXT[status] ?? status}</p>
              {account?.application?.decisionNote && (
                <p className="mt-1 text-sm text-muted-foreground">{account.application.decisionNote}</p>
              )}
              {approved && (
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <p>Your rate card: <strong>{account?.tier}</strong></p>
                  <p>Credit limit: <strong>{formatINR(account?.creditLimit ?? 0)}</strong> ({account?.paymentTermsDays ?? 0} days)</p>
                  <p>
                    Outstanding: <strong className={account?.overdue ? "text-destructive" : ""}>{formatINR(account?.balance ?? 0)}</strong>
                    {account?.overdue ? " · overdue" : ""}
                  </p>
                </div>
              )}
              {approved && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm"><Link to="/trade/pad">Bulk order pad</Link></Button>
                  <Button size="sm" variant="outline" onClick={downloadList}>
                    <Download className="size-4" /> Download my price list
                  </Button>
                  <Button asChild size="sm" variant="outline"><Link to="/account">My orders &amp; reorder</Link></Button>
                </div>
              )}
            </div>
          )}

          {!approved && (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-lg font-semibold">Your shop details</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Business / shop name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
                <Input placeholder="Person we should speak to" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                <Input placeholder="GSTIN (if you have one)" maxLength={15} aria-invalid={taxErr?.includes("GSTIN") || undefined} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
                <Input placeholder="PAN (e.g. ABCDE1234F)" maxLength={10} aria-invalid={taxErr?.includes("PAN") || undefined} value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
                <Input placeholder="Mobile number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              {taxErr && <p role="alert" className="-mt-1 text-sm text-destructive">{taxErr}</p>}
              <Textarea rows={3} placeholder="Shop address" value={form.shopAddress} onChange={(e) => setForm({ ...form, shopAddress: e.target.value })} />

              <h2 className="pt-2 font-display text-lg font-semibold">About your business</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ["businessType", "Business type *", BUSINESS_TYPES],
                  ["monthlyVolume", "Monthly purchase estimate *", VOLUME_OPTIONS],
                  ["yearsInBusiness", "Years in business", YEARS_OPTIONS],
                  ["staffCount", "Mechanics / staff", STAFF_OPTIONS],
                ] as const).map(([key, label, opts]) => (
                  <Select key={key} value={form[key] || undefined} onValueChange={(v) => setForm({ ...form, [key]: v })}>
                    <SelectTrigger className="min-h-10" aria-label={label}><SelectValue placeholder={label} /></SelectTrigger>
                    <SelectContent>
                      {opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ))}
                <MultiSelectDropdown label="Scooter brands you service" options={brandOptions} value={brands} onChange={setBrands} />
                <MultiSelectDropdown label="Parts you need most" options={categoryOptions} value={partCategories} onChange={setPartCategories} />
              </div>

              <h2 className="pt-2 font-display text-lg font-semibold">Papers</h2>
              <p className="-mt-2 text-sm text-muted-foreground">
                These stay private. Only our staff can open them, and you can delete any of them here at any time.
              </p>
              <div className="grid gap-2">
                {DOC_FIELDS.map((d) => (
                  <div key={d.field} className="rounded-xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-sm">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{d.label}</span>
                      {docs[d.field] && <Check className="size-4 shrink-0 text-primary" aria-label="attached" />}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <input
                        ref={(el) => { fileRefs.current[d.field] = el; }}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        aria-label={`Upload ${d.label}`}
                        onChange={(e) => void pick(d.field, e.target.files?.[0])}
                      />
                      <Button size="sm" variant="outline" disabled={busy === d.field} onClick={() => fileRefs.current[d.field]?.click()}>
                        {busy === d.field ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                        {docs[d.field] ? "Replace" : "Attach"}
                      </Button>
                      {docs[d.field] && (
                        <Button size="icon" variant="ghost" aria-label={`Remove ${d.label}`} onClick={() => void removeDoc(d.field)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <DocCheckLine check={docs[d.field] ? checks[d.field] : undefined} missing={d.required && !docs[d.field]} />
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                 By submitting, you consent to Shaw Traders EV verifying the attached business documents for account verification purposes.
              </p>
              <Button className="w-full sm:w-auto" disabled={saving} onClick={submit}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                {status ? "Resubmit for approval" : "Submit for approval"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DocCheckLine({ check, missing }: { check?: DocCheck & { running?: boolean }; missing: boolean }) {
  if (missing) return <p className="mt-1.5 text-xs text-muted-foreground">Missing — required</p>;
  if (!check) return null;
  if (check.running) return <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Checking this paper…</p>;
  const label = { ok: "Looks good", unclear: "Unclear", mismatch: "Doesn't match", error: "Couldn't check" }[check.status];
  const tone = check.status === "ok" ? "text-primary" : check.status === "error" ? "text-muted-foreground" : "text-destructive";
  return (
    <div className="mt-1.5 text-xs">
      <p className={`font-semibold ${tone}`}>{label}</p>
      {check.issues.map((i) => <p key={i} className="text-muted-foreground">{i}</p>)}
      {check.status !== "ok" && check.status !== "error" && <p className="text-muted-foreground">You can still send the application — our staff will check it too.</p>}
    </div>
  );
}
