import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createEnquiry } from "@/lib/enquiries.functions";
import { useVehicle } from "@/hooks/useVehicle";
import type { Product } from "@/lib/catalog";

/**
 * "Check availability" — the short form shown instead of the buy buttons
 * while the shop is taking enquiries rather than online orders.
 */
export function EnquiryDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Pick<Product, "id" | "name">;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState("1");
  const { vehicle: saved } = useVehicle();
  const [vehicle, setVehicle] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await createEnquiry({
      data: { productId: product.id, name, phone, qty: Number(qty) || 1, note, vehicle: vehicle || saved?.model || "" },
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    setName("");
    setPhone("");
    setQty("1");
    setNote("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Check availability</DialogTitle>
        </DialogHeader>
        <form onSubmit={send} className="grid gap-3">
          <p className="text-sm text-muted-foreground">{product.name}</p>
          <div className="grid gap-1.5">
            <Label htmlFor="enq-name">Your name</Label>
            <Input id="enq-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="enq-phone">Mobile number</Label>
            <Input id="enq-phone" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="enq-qty">How many</Label>
            <Input id="enq-qty" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="enq-vehicle">Your scooter</Label>
            <Input
              id="enq-vehicle"
              placeholder={saved?.model ?? "e.g. Okinawa Praise"}
              value={vehicle || saved?.model || ""}
              onChange={(e) => setVehicle(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="enq-note">Anything else (optional)</Label>
            <Textarea id="enq-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? "Sending…" : "Send request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
