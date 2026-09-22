import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listEnquiries, replyToEnquiry, setEnquiryStatus } from "@/lib/enquiries.functions";


export const Route = createFileRoute("/manage/enquiries")({
  component: EnquiriesPage,
});

const TABS = [
  { value: "new", label: "Waiting" },
  { value: "contacted", label: "Called back" },
  { value: "closed", label: "Done" },
  { value: "all", label: "Everything" },
] as const;

function EnquiriesPage() {
  const [tab, setTab] = useState<string>("new");
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["manage-enquiries", tab],
    queryFn: () => listEnquiries({ data: { status: tab } }),
  });

  const move = async (id: string, status: string): Promise<void> => {
    const res = await setEnquiryStatus({ data: { id, status } });
    if (!res.ok) {
      toast.error(res.error ?? "Could not update");
      return;
    }

    toast.success("Updated");
    void queryClient.invalidateQueries({ queryKey: ["manage-enquiries"] });
  };

  const items = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${
              tab === t.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isPending && [0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}

      {!isPending && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No availability requests here.
        </p>
      )}

      {items.map((e) => (
        <EnquiryCard key={e.id} enquiry={e} onMove={move} />
      ))}
    </div>
  );
}

type Item = Awaited<ReturnType<typeof listEnquiries>>[number];

function EnquiryCard({ enquiry: e, onMove }: { enquiry: Item; onMove: (id: string, status: string) => Promise<void> }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"" | "quote" | "out_of_stock" | "alternative">("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState(String(e.qty));
  const [expected, setExpected] = useState("");
  const [productId, setProductId] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!mode) return;
    setBusy(true);
    const res = await replyToEnquiry({
      data: { id: e.id, kind: mode, price: Number(price) || 0, qty: Number(qty) || 1, expectedDate: expected, productId },
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.message);
    toast.success(res.message);
    if (res.quoteLink) void navigator.clipboard?.writeText(res.quoteLink).catch(() => {});
    setMode("");
    void queryClient.invalidateQueries({ queryKey: ["manage-enquiries"] });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="font-semibold leading-snug">{e.productName ?? "Photo sent on WhatsApp"}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(e.createdAt).toLocaleString("en-IN")} · quantity {e.qty}
        {e.source === "whatsapp" ? " · from WhatsApp" : ""}
      </p>
      <p className="mt-2 text-sm">
        {e.name} · {e.phone}
        {e.vehicle ? ` · ${e.vehicle}` : ""}
      </p>
      {e.note && <p className="mt-1 text-sm text-muted-foreground">“{e.note}”</p>}
      {e.photoUrl && (
        <img src={e.photoUrl} alt="Part photo sent by the customer" width={160} height={160}
          className="mt-2 size-40 rounded-xl border border-border object-cover" loading="lazy" />
      )}
      {e.reply && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm">Replied: {e.reply}</p>}
      {e.quoteLink && (
        <p className="mt-1 break-all text-xs text-muted-foreground">Payment link: {e.quoteLink}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={`tel:+91${e.phone}`}>
            <Phone className="size-4" /> Call
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={`https://wa.me/91${e.phone}?text=${encodeURIComponent(
              `Hello ${e.name}, about ${e.productName ?? "the part"} you asked for — `,
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </Button>
        <Button size="sm" variant={mode === "quote" ? "default" : "outline"} onClick={() => setMode(mode === "quote" ? "" : "quote")}>
          Quote a price
        </Button>
        <Button size="sm" variant={mode === "out_of_stock" ? "default" : "outline"} onClick={() => setMode(mode === "out_of_stock" ? "" : "out_of_stock")}>
          Out of stock
        </Button>
        <Button size="sm" variant={mode === "alternative" ? "default" : "outline"} onClick={() => setMode(mode === "alternative" ? "" : "alternative")}>
          Suggest another part
        </Button>
        {e.status !== "contacted" && (
          <Button size="sm" variant="outline" onClick={() => void onMove(e.id, "contacted")}>
            Called back
          </Button>
        )}
        {e.status !== "closed" && (
          <Button size="sm" onClick={() => void onMove(e.id, "closed")}>
            Done
          </Button>
        )}
      </div>

      {mode && (
        <div className="mt-3 grid gap-2 rounded-xl bg-surface p-3 sm:grid-cols-2">
          {mode === "quote" && (
            <>
              <Input inputMode="numeric" placeholder="Price for one piece" value={price} onChange={(ev) => setPrice(ev.target.value)} />
              <Input inputMode="numeric" placeholder="Quantity" value={qty} onChange={(ev) => setQty(ev.target.value)} />
            </>
          )}
          {mode === "out_of_stock" && (
            <Input type="date" value={expected} onChange={(ev) => setExpected(ev.target.value)} />
          )}
          {mode === "alternative" && (
            <Input placeholder="Part ID of the alternative" value={productId} onChange={(ev) => setProductId(ev.target.value)} />
          )}
          <Button size="sm" disabled={busy} onClick={() => void send()} className="sm:col-span-2">
            {busy ? "Sending…" : "Send on WhatsApp"}
          </Button>
        </div>
      )}
    </div>
  );
}

