import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePurchaseAccess } from "@/hooks/usePurchaseAccess";
import { useTradeAccount } from "@/hooks/useTrade";
import { useStore } from "@/hooks/useStore";
import { addQuoteLines, EMPTY_QUOTE_DRAFT, normalizeQuoteDraft, normalizeQuoteQty, QUOTE_DRAFT_KEY, type QuoteDraft, type QuoteDraftLine } from "@/lib/quote-draft";

type QuoteListContextValue = QuoteDraft & {
  ready: boolean;
  add: (productId: string, qty?: number) => void;
  addMany: (lines: QuoteDraftLine[], note?: string) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  setNote: (note: string) => void;
  clear: () => void;
};

const QuoteListContext = createContext<QuoteListContextValue | null>(null);

function readDraft(): QuoteDraft {
  try {
    const raw = window.localStorage.getItem(QUOTE_DRAFT_KEY);
    return raw ? normalizeQuoteDraft(JSON.parse(raw)) : EMPTY_QUOTE_DRAFT;
  } catch {
    return EMPTY_QUOTE_DRAFT;
  }
}

export function QuoteListProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<QuoteDraft>(EMPTY_QUOTE_DRAFT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === QUOTE_DRAFT_KEY) setDraft(readDraft());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const update = useCallback((change: (current: QuoteDraft) => QuoteDraft) => {
    setDraft((current) => {
      const next = normalizeQuoteDraft(change(current));
      window.localStorage.setItem(QUOTE_DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<QuoteListContextValue>(() => ({
    ...draft,
    ready,
    add: (productId, qty = 1) => update((current) => addQuoteLines(current, [{ productId, qty }])),
    addMany: (lines, note) => update((current) => addQuoteLines(current, lines, note)),
    setQty: (productId, qty) => update((current) => ({ ...current, lines: current.lines.map((line) => line.productId === productId ? { ...line, qty: normalizeQuoteQty(qty) } : line) })),
    remove: (productId) => update((current) => ({ ...current, lines: current.lines.filter((line) => line.productId !== productId) })),
    setNote: (note) => update((current) => ({ ...current, note })),
    clear: () => update(() => EMPTY_QUOTE_DRAFT),
  }), [draft, ready, update]);

  return <QuoteListContext.Provider value={value}>{children}</QuoteListContext.Provider>;
}

export function useQuoteList() {
  const value = useContext(QuoteListContext);
  if (!value) throw new Error("useQuoteList must be used inside QuoteListProvider");
  return value;
}

export function useQuoteAccess() {
  const { authReady, user } = useStore();
  const purchase = usePurchaseAccess();
  const trade = useTradeAccount(authReady && Boolean(user));
  const controlReady = authReady && (!user || (purchase.ready && trade.ready));
  return {
    ready: controlReady,
    allowed: controlReady && purchase.reason === "trade" && trade.isTrade,
    reason: purchase.reason,
    account: trade.account,
  };
}