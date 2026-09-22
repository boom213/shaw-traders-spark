import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listEnquiries, setEnquiryStatus } from "@/lib/enquiries.functions";

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

  const move = async (id: string, status: string) => {
    const res = await setEnquiryStatus({ data: { id, status } });
    if (!res.ok) return toast.error(res.error ?? "Could not update");
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
        <div key={e.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="font-semibold leading-snug">{e.productName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(e.createdAt).toLocaleString("en-IN")} · quantity {e.qty}
          </p>
          <p className="mt-2 text-sm">
            {e.name} · {e.phone}
          </p>
          {e.note && <p className="mt-1 text-sm text-muted-foreground">“{e.note}”</p>}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`tel:+91${e.phone}`}>
                <Phone className="size-4" /> Call
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a
                href={`https://wa.me/91${e.phone}?text=${encodeURIComponent(
                  `Hello ${e.name}, about ${e.productName} you asked for — `,
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            </Button>
            {e.status !== "contacted" && (
              <Button size="sm" variant="outline" onClick={() => void move(e.id, "contacted")}>
                Called back
              </Button>
            )}
            {e.status !== "closed" && (
              <Button size="sm" onClick={() => void move(e.id, "closed")}>
                Done
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
