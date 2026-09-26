import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Banknote, Loader2, Plus, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toWebp } from "@/lib/photo-upload";
import { supabase } from "@/integrations/supabase/client";
import { recordStandaloneVendorPayment, saveVendor, vendorDashboard } from "@/lib/vendor-payments.functions";

export const Route = createFileRoute("/manage/vendors")({
  head: () => ({ meta: [
    { title: "Vendor Payments — Manager Panel" },
    { name: "description", content: "Manage approved vendor QR codes and supplier payment records." },
    { name: "robots", content: "noindex" },
    { property: "og:title", content: "Vendor Payments — Manager Panel" },
    { property: "og:description", content: "Secure vendor QR and supplier payment records." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: VendorPaymentsPage,
});

const money = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

function VendorPaymentsPage() {
  const qc = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["vendor-dashboard"], queryFn: () => vendorDashboard() });
  const [vendor, setVendor] = useState({ name: "", upiId: "", qrImagePath: "" });
  const [payment, setPayment] = useState({ vendorId: "", amount: "", paidOn: today(), reference: "", note: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["vendor-dashboard"] });

  async function uploadQr(file: File) {
    const blob = await toWebp(file);
    const path = `${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage.from("vendor-qr-codes").upload(path, blob, { contentType: "image/webp", upsert: false });
    if (error) throw new Error(error.message);
    return path;
  }

  return <div className="space-y-8">
    <header className="border-b border-border pb-5"><h2 className="font-display text-2xl font-bold">Vendor Payments</h2><p className="mt-1 text-sm text-muted-foreground">Approved payment destinations and an auditable record of supplier payments.</p></header>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Cash collected this month" value={money(data?.cashThisMonth ?? 0)} /><Metric label="Active vendors" value={String(data?.vendors.filter((item) => item.active).length ?? 0)} /><Metric label="Vendor payments this month" value={money(data?.vendors.reduce((sum, item) => sum + item.thisMonth, 0) ?? 0)} /></div>
    {data?.canManageVendors && <section className="space-y-4 border-b border-border pb-8"><div><h3 className="font-display text-lg font-bold">Add vendor</h3><p className="text-sm text-muted-foreground">Only super admins can add or replace payment QR codes.</p></div><div className="grid gap-3 md:grid-cols-3"><Input placeholder="Vendor name" value={vendor.name} onChange={(e) => setVendor({ ...vendor, name: e.target.value })} /><Input placeholder="UPI ID (optional)" value={vendor.upiId} onChange={(e) => setVendor({ ...vendor, upiId: e.target.value })} /><Input type="file" accept="image/*" aria-label="Vendor QR image" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { setBusy(true); const qrImagePath = await uploadQr(file); setVendor((value) => ({ ...value, qrImagePath })); toast.success("QR image ready"); } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed"); } finally { setBusy(false); } }} /></div><Button disabled={busy || !vendor.name || !vendor.qrImagePath} onClick={async () => { setBusy(true); const result = await saveVendor({ data: vendor }); setBusy(false); if (!result.ok) return toast.error(result.error); setVendor({ name: "", upiId: "", qrImagePath: "" }); toast.success("Vendor added"); await refresh(); }}><Plus className="size-4" /> Add vendor</Button></section>}
    <section className="space-y-4"><h3 className="font-display text-lg font-bold">Vendor QR codes</h3>{isPending ? <p className="text-sm text-muted-foreground">Loading…</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data?.vendors.map((item) => <article key={item.id} className="rounded-lg border bg-card p-4"><div className="flex gap-4">{item.qrUrl ? <img src={item.qrUrl} alt={`${item.name} payment QR code`} className="size-28 rounded-md border object-contain" /> : <div className="grid size-28 place-items-center rounded-md border bg-muted"><QrCode className="size-8" /></div>}<div className="min-w-0 flex-1"><h4 className="font-semibold">{item.name}</h4><p className="text-xs text-muted-foreground">{item.upiId ?? "No UPI ID"}</p><p className="mt-3 text-sm">This month <strong>{money(item.thisMonth)}</strong></p><p className="text-sm">All time <strong>{money(item.allTime)}</strong></p>{data.canManageVendors && <label className="mt-3 flex items-center gap-2 text-xs"><Switch checked={item.active} disabled={busy} onCheckedChange={async (active) => { setBusy(true); const result = await saveVendor({ data: { id: item.id, name: item.name, upiId: item.upiId ?? "", active } }); setBusy(false); if (!result.ok) return toast.error(result.error); await refresh(); }} />{item.active ? "Active" : "Retired"}</label>}</div></div></article>)}</div>}</section>
    <section className="space-y-4 border-y border-border py-8"><div><h3 className="font-display text-lg font-bold">Pay a vendor</h3><p className="text-sm text-muted-foreground">For supplier payments not tied to a customer receipt.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={payment.vendorId} onChange={(e) => setPayment({ ...payment, vendorId: e.target.value })}><option value="">Choose active vendor</option>{data?.vendors.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><Input type="number" min="0.01" step="0.01" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /><Input type="date" value={payment.paidOn} onChange={(e) => setPayment({ ...payment, paidOn: e.target.value })} /><Input placeholder="Reference (optional)" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /><Button disabled={busy || !payment.vendorId || Number(payment.amount) <= 0} onClick={async () => { setBusy(true); const result = await recordStandaloneVendorPayment({ data: { ...payment, amount: Number(payment.amount) } }); setBusy(false); if (!result.ok) return toast.error(result.error); setPayment({ vendorId: "", amount: "", paidOn: today(), reference: "", note: "" }); toast.success("Vendor payment recorded"); await refresh(); }}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" />} Record</Button></div><Textarea placeholder="Internal note (optional)" value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} /></section>
    <section className="space-y-3"><h3 className="font-display text-lg font-bold">Payment history</h3><div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[720px] text-sm"><thead className="bg-muted"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Vendor</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Reference</th><th className="px-3 py-2 text-left">Recorded by</th></tr></thead><tbody>{data?.payments.map((item) => <tr key={item.id} className="border-t"><td className="px-3 py-2">{item.paidOn}</td><td className="px-3 py-2">{item.vendorName}{item.linked ? <span className="block text-xs text-muted-foreground">Linked to customer payment</span> : null}</td><td className="px-3 py-2 text-right font-semibold">{money(item.amount)}</td><td className="px-3 py-2">{item.reference ?? item.note ?? "—"}</td><td className="px-3 py-2">{item.recordedBy}<span className="block text-xs text-muted-foreground">{item.recordedByEmail}</span></td></tr>)}</tbody></table></div></section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border-l-4 border-primary bg-muted/40 p-4"><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></div>; }