import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { dailySummaryPreview, sendCartRemindersNow, sendServiceRemindersNow, sendSummaryNow } from "@/lib/manage-data.functions";
import { formatINR } from "@/lib/catalog";

export const Route = createFileRoute("/manage/summary")({
  head: () => ({ meta: [{ title: "Daily Summary — Manager Panel" }, { name: "robots", content: "noindex" }] }),
  component: SummaryPage,
});

function SummaryPage() {
  const load = useServerFn(dailySummaryPreview);
  const send = useServerFn(sendSummaryNow);
  const { data, isPending, refetch } = useQuery({ queryKey: ["daily-summary"], queryFn: () => load() });

  const sendNow = useMutation({
    mutationFn: () => send(),
    onSuccess: () => {
      toast.success("Summary sent to your WhatsApp");
      void refetch();
    },
    onError: () => toast.error("Could not send the summary"),
  });

  const sendCart = useServerFn(sendCartRemindersNow);
  const sendService = useServerFn(sendServiceRemindersNow);
  const cartReminders = useMutation({
    mutationFn: () => sendCart(),
    onSuccess: (r) => { toast.success(`${r.sent} cart ${r.sent === 1 ? "reminder" : "reminders"} sent`); void refetch(); },
    onError: () => toast.error("Could not send cart reminders"),
  });
  const serviceReminders = useMutation({
    mutationFn: () => sendService(),
    onSuccess: (r) => { toast.success(`${r.sent} service ${r.sent === 1 ? "reminder" : "reminders"} sent`); void refetch(); },
    onError: () => toast.error("Could not send service reminders"),
  });

  if (isPending || !data) return <SparkCharge label="Loading today's numbers…" />;

  return (
    <div className="grid gap-6 py-2 lg:grid-cols-[1fr_340px]">
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Orders today" value={String(data.orders)} />
          <Stat label="Revenue today" value={formatINR(data.revenue)} />
          <Stat label="Items low on stock" value={String(data.lowStockCount)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold">Today's summary message</h2>
            <Button size="sm" disabled={sendNow.isPending} onClick={() => sendNow.mutate()}>
              {sendNow.isPending ? <SparkRing /> : null}{sendNow.isPending ? "Sending…" : "Send to me now"}
            </Button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-surface p-4 text-sm leading-relaxed">{data.body}</pre>
          <p className="mt-3 text-xs text-muted-foreground">
            {data.whatsappReady
              ? "Press the button whenever you want today's numbers on your WhatsApp."
              : "WhatsApp is not connected yet, so this is only shown here for now."}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-bold">Customer reminders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing is sent automatically. Press a button to send WhatsApp reminders now; customers already reminded are skipped.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button size="sm" variant="outline" disabled={cartReminders.isPending} onClick={() => cartReminders.mutate()}>
              {cartReminders.isPending ? <SparkRing /> : null}Send abandoned-cart reminders
            </Button>
            <Button size="sm" variant="outline" disabled={serviceReminders.isPending} onClick={() => serviceReminders.mutate()}>
              {serviceReminders.isPending ? <SparkRing /> : null}Send scooter service reminders
            </Button>
          </div>
        </div>
      </div>

      <aside className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">Recent messages</h2>
        {data.recent.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Nothing has been sent yet.</p>}
        <ul className="mt-3 grid gap-3">
          {data.recent.map((n, i) => (
            <li key={i} className="border-b border-border pb-2 text-sm last:border-0">
              <p className="font-medium">{n.kind}</p>
              <p className="text-xs text-muted-foreground">
                {n.recipient} · {n.status} · {new Date(n.createdAt).toLocaleString("en-IN")}
              </p>
              {n.error && <p className="text-xs text-destructive">{n.error}</p>}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
