import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, Search } from "lucide-react";
import { useRef, useState } from "react";
import { formatINR } from "@/lib/catalog";
import { suggestQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const term = q.trim();
  const { data } = useQuery(suggestQuery(term));
  const products = data?.products ?? [];
  const models = data?.models ?? [];
  const hasSuggestions = products.length > 0 || models.length > 0;

  const go = (value: string) => {
    setOpen(false);
    void navigate({ to: "/shop", search: { q: value || undefined } });
  };

  const pick = (fn: () => void) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setOpen(false);
    fn();
  };

  return (
    <div className={cn("relative w-full", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 140);
          }}
          placeholder="Search battery, charger, motor, bike model…"
          aria-label="Search products"
          className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
        />
      </form>

      {open && hasSuggestions && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-[var(--shadow-lift)]">
          <ul>
            {products.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={() => pick(() => void navigate({ to: "/product/$slug", params: { slug: p.slug } }))}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.price !== undefined && <span className="text-xs text-muted-foreground">{formatINR(p.price)}</span>}
                </button>
              </li>
            ))}
            {models.map((m) => (
              <li key={m}>
                <button
                  type="button"
                  onMouseDown={() => pick(() => void navigate({ to: "/shop", search: { model: m } }))}
                  className="flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <Bike className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">Parts that fit {m}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
