import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/catalog";
import { useStore } from "@/hooks/useStore";
import { cn } from "@/lib/utils";

const SPEC_HINTS = [
  "48V battery",
  "60V battery",
  "72V charger",
  "controller",
  "hub motor",
  "e-rickshaw battery",
  "electric scooty mudguard",
];

export function SearchBox({ className, autoFocus }: { className?: string; autoFocus?: boolean }) {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const pool = [
      ...state.products.map((p) => p.name),
      ...state.products.flatMap((p) => [p.brand, p.model, p.voltage, p.ah, p.wattage].filter(Boolean) as string[]),
      ...state.brands,
      ...CATEGORIES.map((c) => c.name),
      ...SPEC_HINTS,
    ];
    return Array.from(new Set(pool.filter((s) => s.toLowerCase().includes(term)))).slice(0, 7);
  }, [q, state.products, state.brands]);

  const go = (value: string) => {
    setOpen(false);
    navigate({ to: "/shop", search: { q: value || undefined } });
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
            blurTimer.current = setTimeout(() => setOpen(false), 120);
          }}
          placeholder="Search batteries, chargers, controllers, motors..."
          aria-label="Search products"
          className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background"
        />
      </form>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover shadow-[var(--shadow-lift)]">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  setQ(s);
                  go(s);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
              >
                <Search className="size-3.5 text-muted-foreground" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
