import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { dashboard } from "@/lib/dashboard.functions";
import { needsAttention } from "@/lib/attention.functions";
import { formatINR } from "@/lib/catalog";


export const Route = createFileRoute("/manage/")({
  component: ManageOverview,
});

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function ManageOverview() {
  const { data, isPending } = useQuery({ queryKey: ["manage-dashboard"], queryFn: () => dashboard() });
  const { data: attention } = useQuery({ queryKey: ["manage-attention"], queryFn: () => needsAttention() });

  if (isPending || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {attention && attention.items.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg font-bold">Needs your attention today</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {attention.items.map((i) => (
              <li key={i.key}>
                <Link to={i.to} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2.5 text-sm hover:bg-muted">
                  <span>{i.label}</span>
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{i.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">

        <Stat label="Orders today" value={String(data.todayOrders)} note={formatINR(data.todayRevenue)} />
        <Stat label="This week" value={formatINR(data.weekRevenue)} note="Sales value" />
        <Stat label="Last 30 days" value={formatINR(data.monthRevenue)} note="Sales value" />
        <Stat label="To pack" value={String(data.pendingOrders)} note="Orders waiting" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Best sellers (last 30 days)">
          {data.bestSellers.length === 0 && <Empty text="No sales yet." />}
          <ul className="grid gap-2 text-sm">
            {data.bestSellers.map((b) => (
              <li key={b.name} className="flex justify-between gap-3">
                <span className="line-clamp-1">{b.name}</span>
                <span className="shrink-0 text-muted-foreground">{b.qty} sold · {formatINR(b.revenue)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Searches that found nothing">
          {data.emptySearches.length === 0 && <Empty text="Nothing yet — this fills up as customers search." />}
          <ul className="flex flex-wrap gap-2">
            {data.emptySearches.map((s) => (
              <li key={s.term} className="rounded-full border border-border px-3 py-1 text-sm">
                {s.term} <span className="text-muted-foreground">×{s.hits}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">These are parts customers asked for and could not find on your site.</p>
        </Panel>

        <Panel title="Problems reported by customers' phones today">
          {data.errorsToday === 0 ? (
            <Empty text="No problems reported today." />
          ) : (
            <>
              <p className="text-sm font-semibold">{data.errorsToday} report{data.errorsToday === 1 ? "" : "s"} today</p>
              <ul className="mt-2 grid gap-2 text-sm">
                {data.recentErrors.map((e, i) => (
                  <li key={`${e.at}-${i}`} className="rounded-lg border border-border p-2">
                    <span className="line-clamp-2">{e.message}</span>
                    {e.url && <span className="block text-xs text-muted-foreground">{e.url}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Running low">
          {data.lowStock.length === 0 && <Empty text="Nothing is below its reorder level." />}
          <ul className="grid gap-2 text-sm">
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span className="line-clamp-1">{p.name}</span>
                <span className={`shrink-0 ${p.stock === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Still to fill in">
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>{data.noPrice} products have no price — customers see “Contact us for price”.</li>
            <li>{data.noPhoto} products have no photo of their own.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/manage/catalogue" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Add prices & photos
            </Link>
            <Link to="/manage/import" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
              Price list in a spreadsheet
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h2 className="mb-3 font-display text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
