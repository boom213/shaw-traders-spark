import { useEffect, useId, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CounterProduct } from "@/lib/counter-sales.functions";
import { placeholderFor } from "@/lib/placeholders";
import { moveSuggestion, suggestionsFor } from "@/lib/suggestion-keys";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  /** The term the current results were searched for. */
  searchedFor: string;
  results: CounterProduct[];
  loading: boolean;
  onSearchNow: (term: string) => void;
  /** Adds the product; return false to keep the typed text (e.g. no price). */
  onPick: (product: CounterProduct) => boolean;
  money: (value: number) => string;
};

/**
 * Billing product search with the top 4 matches suggested under the box.
 * Arrow keys move, Enter or a click adds the highlighted part, Esc closes.
 */
export function CounterProductSearch({
  value,
  onValueChange,
  searchedFor,
  results,
  loading,
  onSearchNow,
  onPick,
  money,
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const suggestions = open ? suggestionsFor(value, searchedFor, results, loading) : [];

  // Start from the best match whenever a new set of suggestions arrives.
  useEffect(() => setActive(0), [searchedFor, results]);

  function pick(product: CounterProduct) {
    if (!onPick(product)) return;
    onValueChange("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setActive((index) => moveSuggestion(event.key, index, suggestions.length));
      return;
    }
    if (event.key === "Enter" && suggestions.length > 0) {
      event.preventDefault();
      pick(suggestions[Math.min(active, suggestions.length - 1)]!);
    }
  }

  const activeId =
    suggestions.length > 0 ? `${listId}-${Math.min(active, suggestions.length - 1)}` : undefined;

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearchNow(value.trim());
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Input
          ref={inputRef}
          role="combobox"
          aria-label="Search sale products"
          aria-autocomplete="list"
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
          aria-activedescendant={activeId}
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder="Search name, SKU, category, brand or shelf"
        />
        {suggestions.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Top matches"
            className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
          >
            {suggestions.map((product, index) => {
              const price = product.wholesalePrice ?? product.retailPrice;
              return (
                <li
                  key={product.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Keep focus in the box so a click adds instead of closing the list first.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(product)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${index === active ? "bg-muted" : ""}`}
                >
                  <img
                    src={product.image ?? placeholderFor("parts")}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    className="size-8 shrink-0 rounded border object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{product.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {product.sku} ·{" "}
                      <span className={product.stock > 0 ? "" : "font-semibold text-destructive"}>
                        Stock {product.stock}
                      </span>
                      {product.rackLocation ? ` · ${product.rackLocation}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-primary">
                    {price == null ? "No price" : money(price)}
                  </span>
                </li>
              );
            })}
            <li role="presentation" className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              ↑ ↓ to choose · Enter to add · Esc to close
            </li>
          </ul>
        )}
      </div>
      <Button type="submit" variant="outline">
        <Search className="size-4" /> Search
      </Button>
    </form>
  );
}
