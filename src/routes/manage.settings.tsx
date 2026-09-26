import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getShopSettings, saveShopSettings, type ShopSettingsRow } from "@/lib/manage-data.functions";
import { ORDERING_MODES } from "@/lib/ordering";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/manage/settings")({
  head: () => ({ meta: [{ title: "Site Settings — Manager Panel" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const load = useServerFn(getShopSettings);
  const save = useServerFn(saveShopSettings);
  const queryClient = useQueryClient();
  const { data, refetch } = useQuery({ queryKey: ["shop-settings-admin"], queryFn: () => load() });
  const [form, setForm] = useState<ShopSettingsRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  if (!form) return <p className="py-10 text-sm text-muted-foreground">Loading settings…</p>;

  const set = <K extends keyof ShopSettingsRow>(k: K, v: ShopSettingsRow[K]) => setForm({ ...form, [k]: v });

  const submit = async () => {
    setSaving(true);
    const { onlinePayments: _ignored, whatsappReady: _ready, isSuperAdmin: _sa, ...rest } = form;
    const res = await save({ data: rest });
    setSaving(false);
    if (!res.ok) return toast.error(res.error ?? "Could not save.");
    toast.success("Settings saved");
    await queryClient.invalidateQueries({ queryKey: ["shop-settings"] });
    void refetch();
  };

  const locked = !form.isSuperAdmin;

  return (
    <div className="grid max-w-2xl gap-6 py-6">
      <section className="grid gap-3 rounded-2xl border-2 border-primary/40 bg-card p-5">
        <h2 className="font-display text-base font-bold">What customers can do right now</h2>
        {locked && (
          <p className="text-xs text-muted-foreground">Only the shop owner account can change this.</p>
        )}
        <div className="grid gap-2">
          {ORDERING_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              disabled={locked}
              onClick={() => set("orderingMode", m.value)}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
                form.orderingMode === m.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
              )}
            >
              <span className="block text-sm font-semibold">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.help}</span>
            </button>
          ))}
        </div>
        {form.orderingMode !== "full" && (
          <Field label="Message shown at the top of the website">
            <Textarea
              rows={2}
              disabled={locked}
              value={form.browseBanner}
              onChange={(e) => set("browseBanner", e.target.value)}
              placeholder="Please call the shop to confirm stock before visiting."
            />
          </Field>
        )}
        <p className="text-xs text-muted-foreground">Saving this takes effect for customers straight away.</p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">Homepage sections</h2>
        <Row label="Show electric scooters at our showroom">
          <Switch checked={form.showShowroomSection} onCheckedChange={(v) => set("showShowroomSection", v)} />
        </Row>
        <p className="text-xs text-muted-foreground">Switch this off to hide the complete showroom scooter section from the homepage.</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">Online payments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {form.onlinePayments
            ? "Card, UPI, netbanking and wallet payments are switched on."
            : "Online payment is switched off because the payment keys have not been saved yet. Customers can only pay cash on delivery."}
        </p>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">Order messages</h2>
        <p className="text-sm text-muted-foreground">
          {form.whatsappReady
            ? "WhatsApp is connected. New orders, status updates and the daily summary go out automatically."
            : "WhatsApp is not connected yet, so messages are only recorded, not delivered. Ask to connect WhatsApp Business and everything starts sending."}
        </p>
        <Row label="Send order messages">
          <Switch checked={form.notifyEnabled} onCheckedChange={(v) => set("notifyEnabled", v)} />
        </Row>
        <Field label="Your WhatsApp number (for new orders and the daily summary)">
          <Input value={form.ownerWhatsapp} onChange={(e) => set("ownerWhatsapp", e.target.value)} placeholder="7501849610" />
        </Field>
        <Field label="Your email for the daily summary">
          <Input value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} placeholder="shawtradersev@gmail.com" />
        </Field>
        <Field label="Warn me when stock falls to or below">
          <Input type="number" value={String(form.lowStockThreshold)} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">GST</h2>
        <Row label="Charge GST on orders">
          <Switch disabled={locked} checked={form.gstEnabled} onCheckedChange={(v) => set("gstEnabled", v)} />
        </Row>
        <Row label="Prices already include GST">
          <Switch disabled={locked} checked={form.pricesIncludeGst} onCheckedChange={(v) => set("pricesIncludeGst", v)} />
        </Row>
        <Field label="GST rate (%)">
          <Input
            type="number"
            disabled={locked}
            value={String(form.gstRate)}
            onChange={(e) => set("gstRate", Number(e.target.value))}
          />
        </Field>
        <Field label="GSTIN (leave blank if you do not have one yet)">
          <Input disabled={locked} value={form.gstin} onChange={(e) => set("gstin", e.target.value)} placeholder="19ABCDE1234F1Z5" />
        </Field>
        <Field label="Business name on the bill">
          <Input value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
        </Field>
        <Field label="Default HSN code on invoices">
          <Input value={form.defaultHsn} onChange={(e) => set("defaultHsn", e.target.value)} placeholder="8507" />
        </Field>
        <Field label="Billing address on the bill">
          <Textarea rows={3} value={form.billingAddress} onChange={(e) => set("billingAddress", e.target.value)} />
        </Field>
        <p className="text-xs text-muted-foreground">
          You can also switch GST off for a single order from the order list, for customers who do not need a GST bill.
        </p>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">Business details on the website</h2>
        <p className="text-xs text-muted-foreground">
          These appear on the policy pages and the contact page. Indian online-selling rules ask every shop to
          name a person who handles complaints, with their email and phone number.
        </p>
        <Field label="Email customers can write to">
          <Input value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} placeholder="shawtradersev@gmail.com" />
        </Field>
        <Field label="Name of the person who handles complaints">
          <Input value={form.grievanceName} onChange={(e) => set("grievanceName", e.target.value)} placeholder="Full name" />
        </Field>
        <Field label="Their email">
          <Input value={form.grievanceEmail} onChange={(e) => set("grievanceEmail", e.target.value)} placeholder="name@example.com" />
        </Field>
        <Field label="Their phone number">
          <Input value={form.grievancePhone} onChange={(e) => set("grievancePhone", e.target.value)} placeholder="7501849610" />
        </Field>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">Cash on delivery</h2>
        <Row label="Allow cash on delivery">
          <Switch checked={form.codEnabled} onCheckedChange={(v) => set("codEnabled", v)} />
        </Row>
        <Field label="Maximum order value for cash on delivery (₹)">
          <Input type="number" value={String(form.codLimit)} onChange={(e) => set("codLimit", Number(e.target.value))} />
        </Field>
        <Field label="PIN codes where cash on delivery works (leave blank for everywhere)">
          <Textarea
            rows={3}
            value={form.codPincodes}
            onChange={(e) => set("codPincodes", e.target.value)}
            placeholder="713403, 713401, 713101"
          />
        </Field>
      </section>

      <Button size="lg" className="w-fit" disabled={saving} onClick={() => void submit()}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
