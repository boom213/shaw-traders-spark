export const QUOTE_DRAFT_KEY = "shaw-ev-quote";
export const MAX_QUOTE_QTY = 9999;

export type QuoteDraftLine = { productId: string; qty: number };
export type QuoteDraft = { lines: QuoteDraftLine[]; note: string };

export const EMPTY_QUOTE_DRAFT: QuoteDraft = { lines: [], note: "" };

export function normalizeQuoteQty(value: unknown): number {
  const qty = Math.round(Number(value));
  return Number.isFinite(qty) ? Math.min(MAX_QUOTE_QTY, Math.max(1, qty)) : 1;
}

export function normalizeQuoteDraft(value: unknown): QuoteDraft {
  if (!value || typeof value !== "object") return EMPTY_QUOTE_DRAFT;
  const candidate = value as Partial<QuoteDraft>;
  const byProduct = new Map<string, number>();
  for (const line of Array.isArray(candidate.lines) ? candidate.lines.slice(0, 100) : []) {
    if (!line || typeof line.productId !== "string" || !line.productId) continue;
    byProduct.set(line.productId, normalizeQuoteQty((byProduct.get(line.productId) ?? 0) + Number(line.qty ?? 1)));
  }
  return {
    lines: [...byProduct].map(([productId, qty]) => ({ productId, qty })),
    note: String(candidate.note ?? "").trim().slice(0, 500),
  };
}

export function addQuoteLines(draft: QuoteDraft, incoming: QuoteDraftLine[], note?: string): QuoteDraft {
  return normalizeQuoteDraft({
    lines: [...draft.lines, ...incoming],
    note: [draft.note, note?.trim()].filter(Boolean).join("\n").slice(0, 500),
  });
}

export function customerQuoteStatus(status: string): "quote.statusAwaiting" | "quote.statusReady" | "quote.statusAccepted" | "quote.statusDeclined" | "quote.statusExpired" {
  if (status === "priced") return "quote.statusReady";
  if (status === "accepted") return "quote.statusAccepted";
  if (status === "rejected") return "quote.statusDeclined";
  if (status === "expired") return "quote.statusExpired";
  return "quote.statusAwaiting";
}