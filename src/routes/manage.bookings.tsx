import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListPager } from "@/components/manage/ListPager";
import { ExportCsvButton } from "@/components/manage/ExportCsvButton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/catalog";
import { MANAGE_QUERY_OPTIONS } from "@/lib/manage-query";
import { BOOKING_FLOW, bookingStatusLabel } from "@/lib/vehicles";
import {
  addServiceRecord,
  listBookings,
  listLeads,
  listServiceDue,
  recordDelivery,
  resolveBookingPaymentReview,
  setBookingStatus,
  updateLead,
  type BookingRow,
} from "@/lib/vehicles-admin.functions";
import { exportBookingsCsv } from "@/lib/manage-exports.functions";
import { BookingReceipts, AddBookingReceipt } from "@/components/manage/BookingReceipts";
import { ShowroomSaleDialog } from "@/components/manage/ShowroomSaleDialog";
import { roleAtLeast, type StaffRole } from "@/lib/staff-permissions";
import { can } from "@/lib/staff-permissions";

export const Route = createFileRoute("/manage/bookings")({
  component: ManageBookings,
  head: () => ({
    meta: [
      { title: "Bookings & Showroom Sales — Shaw Traders EV" },
      {
        name: "description",
        content:
          "Manage scooter bookings, showroom sales, receipts and service handovers at Shaw Traders EV.",
      },
      { property: "og:title", content: "Bookings & Showroom Sales — Shaw Traders EV" },
      {
        property: "og:description",
        content: "Scooter bookings, showroom receipts and service management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const LEAD_KINDS = [
  { value: "test_ride", label: "Test rides" },
  { value: "finance", label: "Finance" },
  { value: "exchange", label: "Exchange" },
  { value: "service", label: "Service bookings" },
];

function DeliveryBox({
  booking,
  role,
  onDone,
}: {
  booking: BookingRow;
  role: StaffRole;
  onDone: () => void;
}) {
  const [f, setF] = useState({
    chassisNumber: booking.chassisNumber ?? "",
    motorNumber: booking.motorNumber ?? "",
    batteryNumber: booking.batteryNumber ?? "",
    registrationNumber: booking.registrationNumber ?? "",
    unpaidOverrideReason: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const qc = useQueryClient();
  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["chassisNumber", "Chassis number"],
            ["motorNumber", "Motor number"],
            ["batteryNumber", "Battery number"],
            ["registrationNumber", "Registration number"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="grid gap-1 text-sm">
            {label}
            <Input value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} />
          </label>
        ))}
        {booking.saleKind === "showroom" && roleAtLeast(role, "owner") && (
          <label className="grid gap-1 text-sm sm:col-span-2">
            Unpaid delivery override reason
            <Input
              value={f.unpaidOverrideReason}
              onChange={(e) => setF({ ...f, unpaidOverrideReason: e.target.value })}
            />
          </label>
        )}
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await recordDelivery({ data: { bookingId: booking.id, ...f } });
              setMsg(
                r.ok ? "Handover recorded, warranty started." : (r.error ?? "Could not save."),
              );
              if (r.ok) onDone();
            } catch (err) {
              setMsg(err instanceof Error ? err.message : "Could not save.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Saving…" : "Record handover"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setReceiptOpen(!receiptOpen)}>
          Add receipt
        </Button>
        {msg && (
          <p role="status" className="text-sm sm:col-span-2">
            {msg}
          </p>
        )}
      </div>
      {receiptOpen && (
        <AddBookingReceipt
          bookingId={booking.id}
          onDone={() => {
            setReceiptOpen(false);
            qc.invalidateQueries({ queryKey: ["booking-receipts", booking.id] });
            onDone();
          }}
        />
      )}
    </div>
  );
}

function ManageBookings() {
  const { staff } = Route.useRouteContext();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");
  const [leadKind, setLeadKind] = useState("test_ride");
  const [bookingPage, setBookingPage] = useState(0);
  const [leadPage, setLeadPage] = useState(0);

  const { data: bookings, isFetching: bookingsFetching } = useQuery({
    queryKey: ["bookings", filter, bookingPage],
    queryFn: () => listBookings({ data: { status: filter, page: bookingPage } }),
    placeholderData: (previous) => previous,
    ...MANAGE_QUERY_OPTIONS,
  });
  const { data: leads, isFetching: leadsFetching } = useQuery({
    queryKey: ["vehicle-leads", leadKind, leadPage],
    queryFn: () => listLeads({ data: { kind: leadKind, page: leadPage } }),
    placeholderData: (previous) => previous,
    ...MANAGE_QUERY_OPTIONS,
  });
  const { data: due } = useQuery({ queryKey: ["service-due"], queryFn: () => listServiceDue() });

  const move = useMutation({
    mutationFn: (v: { bookingId: string; status: string }) => setBookingStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });

  return (
    <div className="grid gap-10">
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Scooter bookings & showroom sales</h2>
          {can(staff.role, "operations") && <ShowroomSaleDialog role={staff.role} />}
          <div className="flex flex-wrap gap-2">
            <Select
              value={filter}
              onValueChange={(value) => {
                setFilter(value);
                setBookingPage(0);
              }}
            >
              <SelectTrigger className="w-52" aria-label="Filter bookings">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open bookings</SelectItem>
                {BOOKING_FLOW.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="needs_review">Payment needs review</SelectItem>
                <SelectItem value="unpaid_48h">Token unpaid over 48 hours</SelectItem>
              </SelectContent>
            </Select>
            {can(staff.role, "reports") && (
              <ExportCsvButton
                dateRange
                onExport={(range) => exportBookingsCsv({ data: { status: filter, ...range } })}
              />
            )}
          </div>
        </div>

        <div className="grid gap-3">
          {(bookings?.items ?? []).map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {b.humanId} · {b.modelName}
                    {b.colour ? ` · ${b.colour}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.customerName} · {b.phone}
                    {b.alternatePhone ? ` · Alt: ${b.alternatePhone}` : ""} ·{" "}
                    {b.saleKind === "showroom"
                      ? `Showroom · agreed ${formatINR(b.onRoadTotal)} · outstanding ${formatINR(b.balanceDue)}`
                      : `token ${formatINR(b.tokenAmount)} ${b.paymentStatus === "paid" ? "paid" : "unpaid"} · balance ${formatINR(b.balanceDue)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {bookingStatusLabel(b.status)}
                  </span>
                  <Select
                    value={b.status}
                    onValueChange={(v) => move.mutate({ bookingId: b.id, status: v })}
                  >
                    <SelectTrigger className="w-44" aria-label={`Stage for ${b.humanId}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BOOKING_FLOW.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(b.status === "ready_for_delivery" || b.status === "delivered") && (
                <DeliveryBox
                  booking={b}
                  role={staff.role}
                  onDone={() => qc.invalidateQueries({ queryKey: ["bookings"] })}
                />
              )}
              {roleAtLeast(staff.role, "manager") &&
                b.status !== "delivered" &&
                b.status !== "cancelled" && (
                  <div className="mt-3">
                    <ShowroomSaleDialog role={staff.role} booking={b} />
                  </div>
                )}
              <details
                className="mt-3"
                onToggle={(e) => {
                  if (e.currentTarget.open) e.currentTarget.dataset["opened"] = "true";
                }}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  Receipts & outstanding
                </summary>
                <BookingReceipts bookingId={b.id} role={staff.role} />
              </details>
              {b.needsPaymentReview && (
                <BookingPaymentReview
                  booking={b}
                  onDone={() => qc.invalidateQueries({ queryKey: ["bookings"] })}
                />
              )}
            </div>
          ))}
          {(bookings?.items ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing here right now.</p>
          )}
        </div>
        <div className="mt-3">
          <ListPager
            page={bookingPage}
            total={bookings?.total ?? 0}
            busy={bookingsFetching}
            onPage={setBookingPage}
          />
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Requests from customers</h2>
          <Select
            value={leadKind}
            onValueChange={(value) => {
              setLeadKind(value);
              setLeadPage(0);
            }}
          >
            <SelectTrigger className="w-52" aria-label="Request type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_KINDS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          {(leads?.items ?? []).map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div>
                <p className="font-semibold">
                  {l.name} · {l.phone}
                  {l.alternatePhone ? ` · Alt: ${l.alternatePhone}` : ""}
                  {l.model ? ` · ${l.model}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{l.detail}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                  {l.status}
                </span>
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
          {(leads?.items ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No requests of this kind.</p>
          )}
        </div>
        <div className="mt-3">
          <ListPager
            page={leadPage}
            total={leads?.total ?? 0}
            busy={leadsFetching}
            onPage={setLeadPage}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-bold">Services falling due</h2>
        <div className="grid gap-3">
          {(due ?? []).map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div>
                <p className="font-semibold">
                  {s.owner} · {s.phone}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.label} due {new Date(s.dueOn).toLocaleDateString("en-IN")}
                  {s.model ? ` · ${s.model}` : ""}
                  {s.registrationNumber ? ` · ${s.registrationNumber}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await addServiceRecord({
                    data: { registrationId: s.registrationId, scheduleId: s.id, workDone: s.label },
                  });
                  void qc.invalidateQueries({ queryKey: ["service-due"] });
                }}
              >
                Mark serviced
              </Button>
            </div>
          ))}
          {(due ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing due.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function BookingPaymentReview({ booking, onDone }: { booking: BookingRow; onDone: () => void }) {
  const resolve = useMutation({
    mutationFn: (note: string) =>
      resolveBookingPaymentReview({ data: { bookingId: booking.id, note } }),
  });
  const [note, setNote] = useState("");
  return (
    <div className="mt-3 rounded-xl border border-destructive bg-surface p-3">
      <p className="font-semibold text-destructive">Payment needs review</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {booking.paymentReviewNote ?? "Token payment arrived after cancellation."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Input
          className="min-w-52 flex-1"
          placeholder="How was this resolved?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          variant="destructive"
          disabled={resolve.isPending || note.trim().length < 3}
          onClick={() =>
            resolve.mutate(note, {
              onSuccess: (result) => {
                result.ok ? onDone() : undefined;
              },
            })
          }
        >
          {resolve.isPending ? "Saving…" : "Resolve review"}
        </Button>
      </div>
    </div>
  );
}
