import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SparkRing } from "@/components/site/SparkLoaders";
import { createTradeAccountManually } from "@/lib/trade-admin.functions";
import { taxIdError } from "@/lib/trade-options";

type Props = { onDone: (created: { profileId: string; status: "pending" | "approved" }) => Promise<void> };
const EMPTY_FORM = { businessName: "", contactPerson: "", phone: "", gstin: "", shopAddress: "" };

export function AddWholesalerDialog({ onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [verified, setVerified] = useState(true);
  const [submitAs, setSubmitAs] = useState<"pending" | "approved">("approved");
  const [tier, setTier] = useState("trade");
  const [busy, setBusy] = useState(false);
  const taxError = taxIdError(form.gstin);

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button"><Plus className="size-4" /> Add wholesaler</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Add wholesaler</DialogTitle><DialogDescription>For a dealer who sent details by phone or WhatsApp. They can later sign in with a code on this mobile number.</DialogDescription></DialogHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input aria-label="Business name" placeholder="Business name" value={form.businessName} onChange={(event) => setForm({ ...form, businessName: event.target.value })} />
        <Input aria-label="Contact person" placeholder="Contact person" value={form.contactPerson} onChange={(event) => setForm({ ...form, contactPerson: event.target.value })} />
        <Input aria-label="Mobile number" placeholder="10-digit mobile" inputMode="numeric" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        <Input aria-label="GSTIN" placeholder="GSTIN (optional)" maxLength={15} value={form.gstin} onChange={(event) => setForm({ ...form, gstin: event.target.value.toUpperCase() })} />
        <Textarea aria-label="Shop address" className="sm:col-span-2" rows={2} placeholder="Shop address" value={form.shopAddress} onChange={(event) => setForm({ ...form, shopAddress: event.target.value })} />
      </div>
      {taxError && <p role="alert" className="text-sm text-destructive">{taxError}</p>}
      <label className="flex min-h-10 items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={verified} onChange={(event) => setVerified(event.target.checked)} />Documents verified in person (no upload needed)</label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Save as<select className="mt-1 h-10 w-full rounded-md border border-border bg-background px-2" value={submitAs} onChange={(event) => setSubmitAs(event.target.value as "pending" | "approved")}><option value="approved">Approved now</option><option value="pending">Waiting for a second check</option></select></label>
        <label className="text-sm">Rate card<select className="mt-1 h-10 w-full rounded-md border border-border bg-background px-2" value={tier} onChange={(event) => setTier(event.target.value)} disabled={submitAs !== "approved"}><option value="trade">Trade</option><option value="distributor">Distributor</option></select></label>
      </div>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" disabled={busy} onClick={async () => {
        const validationError = taxIdError(form.gstin);
        if (validationError) return toast.error(validationError);
        setBusy(true);
        const result = await createTradeAccountManually({ data: { ...form, docsVerifiedInPerson: verified, submitAs, tier } });
        setBusy(false);
        if (!result.ok) return toast.error(result.error ?? "Could not create the account");
        toast.success(submitAs === "approved" ? "Trade account opened" : "Added to the waiting list");
        setForm(EMPTY_FORM); setOpen(false);
        await onDone({ profileId: result.profileId, status: result.status });
      }}>{busy ? <SparkRing /> : null}{busy ? "Creating…" : "Create account"}</Button></div>
    </DialogContent>
  </Dialog>;
}