import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitBrochureEnquiry } from "@/lib/brochure-enquiry.functions";

type BrochureDownloadDialogProps = Pick<ButtonProps, "className" | "size" | "variant"> & {
  label?: string;
};

export function BrochureDownloadDialog({
  className,
  size = "lg",
  variant = "outline",
  label = "Download Brochure",
}: BrochureDownloadDialogProps) {
  const submitEnquiry = useServerFn(submitBrochureEnquiry);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (name.trim().length < 2) return toast.error("Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) return toast.error("Enter a valid 10-digit Indian mobile number.");

    setBusy(true);
    try {
      const result = await submitEnquiry({
        data: { name, phone: cleanPhone, address, lookingFor },
      });
      if (!result.ok) return toast.error(result.message);

      const download = document.createElement("a");
      download.href = "/api/public/catalogue";
      download.download = "ST-Catalogue-Shaw-Traders.pdf";
      document.body.appendChild(download);
      download.click();
      download.remove();

      toast.success("Thank you. Your brochure download has started.");
      setName("");
      setPhone("");
      setAddress("");
      setLookingFor("");
      setOpen(false);
    } catch {
      toast.error("We could not send your request. Please try again shortly.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" size={size} variant={variant} className={className} onClick={() => setOpen(true)}>
        <Download /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Download Brochure</DialogTitle>
            <DialogDescription>Share your details and the brochure will download immediately after submission.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="brochure-name">Name *</Label>
              <Input
                id="brochure-name"
                name="name"
                autoComplete="name"
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="brochure-phone">Mobile number *</Label>
              <Input
                id="brochure-phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                pattern="[6-9][0-9]{9}"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="brochure-address">Address</Label>
              <Textarea
                id="brochure-address"
                name="address"
                autoComplete="street-address"
                maxLength={500}
                rows={2}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="brochure-looking-for">What are you looking for?</Label>
              <Textarea
                id="brochure-looking-for"
                name="lookingFor"
                maxLength={500}
                rows={3}
                value={lookingFor}
                onChange={(event) => setLookingFor(event.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              <Download /> {busy ? "Submitting…" : "Submit & Download"}
            </Button>
            <p className="text-xs text-muted-foreground">* Name and mobile number are required.</p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}