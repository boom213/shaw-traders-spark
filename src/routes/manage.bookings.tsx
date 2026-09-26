import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/catalog";
import { BOOKING_FLOW, bookingStatusLabel } from "@/lib/vehicles";
import {
  addServiceRecord,
  listBookings,
  listLeads,
  listServiceDue,
  recordDelivery,
  setBookingStatus,
  updateLead,
  type BookingRow,
} from "@/lib/vehicles-admin.functions";

export const Route = createFileRoute("/manage/bookings")({ component: ManageBookings });

const LEAD_KINDS = [
  { value: "test_ride", label: "Test rides" },
  { value: "finance", label: "Finance" },
  { value: "exchange", label: "Exchange" },
  { value: "service", label: "Service bookings" },
];

function DeliveryBox({ booking, onDone }: { booking: BookingRow; onDone: () => void }) {
  const [f, setF] = useState({ chassisNumber: booking.chassisNumber ?? "", motorNumber: booking.motorNumber ?? "", registrationNumber: booking.registrationNumber ?? "" });
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="mt-3 grid gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-4">
      <Input placeholder="Chassis number" aria-label="Chassis number" value={f.chassisNumber} onChange={(e) => setF({ ...f, chassisNumber: e.target.value })} />
      <Input placeholder="Motor number" aria-label="Motor number" value={f.motorNumber} onChange={(e) => setF({ ...f, motorNumber: e.target.value })} />
      <Input placeholder="Registration no." aria-label="Registration number" value={f.registrationNumber} onChange={(e) => setF({ ...f, registrationNumber: e.target.value })} />
      <Button
        size="sm"
        onClick={async () => {
          const r = await recordDelivery({ data: { bookingId: booking.id, ...f } });
          setMsg(r.ok ? "Handover recorded, warranty started." : (r.error ?? "Could not save."));
          if (r.ok) onDone();
        }}
      >
        Record handover
      </Button>
      {msg && <p className="text-sm font-medium text-primary sm:col-span-4">{msg}</p>}
    </div>
  );
}

function ManageBookings() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");
  const [leadKind, setLeadKind] = useState("test_ride");

  const { data: bookings } = useQuery({ queryKey: ["bookings", filter], queryFn: () => listBookings({ data: { status: filter } }) });
  const { data: leads } = useQuery({ queryKey: ["vehicle-leads", leadKind], queryFn: () => listLeads({ data: { kind: leadKind } }) });
  const { data: due } = useQuery({ queryKey: ["service-due"], queryFn: () => listServiceDue() });

  const move = useMutation({
    mutationFn: (v: { bookingId: string; status: string }) => setBookingStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  return (
    <div className="grid gap-10">
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Scooter bookings</h2>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-52" aria-label="Filter bookings"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open bookings</SelectItem>
              {BOOKING_FLOW.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3">
          {(bookings ?? []).map((b) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.humanId} · {b.modelName}{b.colour ? ` · ${b.colour}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.customerName} · {b.phone}{b.alternatePhone ? ` · Alt: ${b.alternatePhone}` : ""} · token {formatINR(b.tokenAmount)} {b.paymentStatus === "paid" ? "paid" : "unpaid"} · balance {formatINR(b.balanceDue)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{bookingStatusLabel(b.status)}</span>
                  <Select value={b.status} onValueChange={(v) => move.mutate({ bookingId: b.id, status: v })}>
                    <SelectTrigger className="w-44" aria-label={`Stage for ${b.humanId}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOOKING_FLOW.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(b.status === "ready_for_delivery" || b.status === "delivered") && (
                <DeliveryBox booking={b} onDone={() => qc.invalidateQueries({ queryKey: ["bookings"] })} />
              )}
            </div>
          ))}
          {(bookings ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing here right now.</p>}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Requests from customers</h2>
          <Select value={leadKind} onValueChange={setLeadKind}>
            <SelectTrigger className="w-52" aria-label="Request type"><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          {(leads ?? []).map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div>
                <p className="font-semibold">{l.name} · {l.phone}{l.alternatePhone ? ` · Alt: ${l.alternatePhone}` : ""}{l.model ? ` · ${l.model}` : ""}</p>
                <p className="text-xs text-muted-foreground">{l.detail}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{l.status}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await updateLead({ data: { kind: l.kind, id: l.id, status: "done" } });
                    void qc.invalidateQueries({ queryKey: ["vehicle-leads"] });
                  }}
                >
                  Mark done
                </Button>
              </div>
            </div>
          ))}
          {(leads ?? []).length === 0 && <p className="text-sm text-muted-foreground">No requests of this kind.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-bold">Services falling due</h2>
        <div className="grid gap-3">
          {(due ?? []).map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
              <div>
                <p className="font-semibold">{s.owner} · {s.phone}</p>
                <p className="text-xs text-muted-foreground">
                  {s.label} due {new Date(s.dueOn).toLocaleDateString("en-IN")}{s.model ? ` · ${s.model}` : ""}{s.registrationNumber ? ` · ${s.registrationNumber}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await addServiceRecord({ data: { registrationId: s.registrationId, scheduleId: s.id, workDone: s.label } });
                  void qc.invalidateQueries({ queryKey: ["service-due"] });
                }}
              >
                Mark serviced
              </Button>
            </div>
          ))}
          {(due ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nothing due.</p>}
        </div>
      </section>
    </div>
  );
}
