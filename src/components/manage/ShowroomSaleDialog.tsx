import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listVehicles } from "@/lib/vehicles.functions";
import {
  createShowroomSale,
  adjustBookingAgreedPrice,
  type BookingRow,
} from "@/lib/vehicles-admin.functions";
import { catalogueSaleLines, SALE_LINE_KINDS, saleTotal, type SaleLine } from "@/lib/showroom";
import { formatINR } from "@/lib/catalog";
import { roleAtLeast, type StaffRole } from "@/lib/staff-permissions";

function initialLines(booking?: BookingRow): SaleLine[] {
  if (!booking) return [];
  if (Array.isArray(booking.priceBreakdown)) return booking.priceBreakdown as SaleLine[];
  const price = booking.priceBreakdown as Record<string, number>;
  return Object.entries(price ?? {}).map(([key, amount]) => ({
    label: key,
    amount: key === "subsidy" ? -Number(amount) : Number(amount),
    kind:
      key === "subsidy"
        ? "subsidy"
        : key === "rto"
          ? "rto"
          : key === "insurance"
            ? "insurance"
            : key === "accessories"
              ? "accessory"
              : "vehicle",
  }));
}
export function ShowroomSaleDialog({ role, booking }: { role: StaffRole; booking?: BookingRow }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={booking ? "outline" : "default"}>
          {booking ? (
            "Adjust agreed price"
          ) : (
            <>
              <Plus className="size-4" />
              New showroom sale
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogTitle>{booking ? `Adjust ${booking.humanId}` : "New showroom sale"}</DialogTitle>
        <DialogDescription>{booking ? booking.customerName : "Walk-in customer"}</DialogDescription>
        {open && <SaleForm role={role} booking={booking} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
function SaleForm({
  role,
  booking,
  onDone,
}: {
  role: StaffRole;
  booking?: BookingRow;
  onDone: () => void;
}) {
  const manager = roleAtLeast(role, "manager");
  const qc = useQueryClient();
  const { data: models, error: modelError } = useQuery({
    queryKey: ["showroom-models"],
    queryFn: () => listVehicles(),
    enabled: !booking,
  });
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    alternatePhone: "",
    address: "",
  });
  const [modelId, setModelId] = useState("");
  const [lines, setLines] = useState<SaleLine[]>(initialLines(booking));
  const [discount, setDiscount] = useState(booking?.discountAmount ?? 0);
  const [reason, setReason] = useState(booking?.discountReason ?? "");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (i: number, patch: Partial<SaleLine>) =>
    setLines(lines.map((line, index) => (index === i ? { ...line, ...patch } : line)));
  return (
    <form
      className="grid gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const result = booking
            ? await adjustBookingAgreedPrice({
                data: { bookingId: booking.id, lines, discount, discountReason: reason },
              })
            : await createShowroomSale({
                data: {
                  productId: modelId,
                  customer,
                  lines,
                  discount,
                  discountReason: reason,
                  expectedDelivery: date,
                },
              });
          if (!result.ok) {
            setError(result.error ?? "Could not save.");
            return;
          }
          await qc.invalidateQueries({ queryKey: ["bookings"] });
          await qc.invalidateQueries({ queryKey: ["booking-receipts"] });
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {!booking && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["name", "Customer name"],
                ["phone", "Mobile number"],
                ["alternatePhone", "Alternate phone"],
                ["address", "Address"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="grid gap-1 text-sm">
                {label}
                <Input
                  required={key === "name" || key === "phone"}
                  pattern={
                    key === "phone"
                      ? "[0-9]{10}"
                      : key === "alternatePhone"
                        ? "[6-9][0-9]{9}"
                        : undefined
                  }
                  value={customer[key]}
                  onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <label className="grid gap-1 text-sm">
            Model
            <select
              required
              className="h-10 rounded-md border border-input bg-background px-3"
              value={modelId}
              onChange={(e) => {
                setModelId(e.target.value);
                const model = models?.find((v) => v.id === e.target.value);
                setLines(model ? catalogueSaleLines(model) : []);
              }}
            >
              <option value="">Select model</option>
              {models?.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </label>
          {modelError && <p role="alert">Models could not load.</p>}
        </>
      )}
      <div className="grid gap-2">
        {lines.map((line, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_110px_36px] gap-2 sm:grid-cols-[1fr_130px_110px_36px]"
          >
            <Input
              aria-label={`Line ${i + 1} label`}
              required
              disabled={!manager}
              value={line.label}
              onChange={(e) => change(i, { label: e.target.value })}
            />
            <select
              aria-label={`Line ${i + 1} type`}
              disabled={!manager}
              className="col-start-1 row-start-2 h-9 rounded-md border border-input bg-background text-sm sm:col-auto sm:row-auto"
              value={line.kind}
              onChange={(e) => change(i, { kind: e.target.value as SaleLine["kind"] })}
            >
              {SALE_LINE_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <Input
              aria-label={`Line ${i + 1} amount`}
              required
              disabled={!manager}
              type="number"
              step="0.01"
              value={line.amount}
              onChange={(e) => change(i, { amount: Number(e.target.value) })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!manager}
              aria-label={`Remove line ${i + 1}`}
              onClick={() => setLines(lines.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      {manager && (
        <>
          <Button
            type="button"
            variant="outline"
            className="justify-self-start"
            onClick={() => setLines([...lines, { label: "", amount: 0, kind: "accessory" }])}
          >
            <Plus className="size-4" />
            Add line
          </Button>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              Discount
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Discount reason
              <Input
                required={discount > 0}
                minLength={discount > 0 ? 3 : undefined}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>
        </>
      )}
      {!booking && (
        <label className="grid gap-1 text-sm">
          Expected delivery
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      )}
      <p className="text-lg font-semibold">Agreed total {formatINR(saleTotal(lines, discount))}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button disabled={busy || lines.length === 0 || saleTotal(lines, discount) <= 0}>
        {busy ? "Saving…" : booking ? "Save agreed price" : "Create showroom sale"}
      </Button>
    </form>
  );
}
