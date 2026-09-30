import { describe, expect, it } from "vitest";
import { addQuoteLines, customerQuoteStatus, EMPTY_QUOTE_DRAFT, normalizeQuoteDraft, normalizeQuoteQty, QUOTE_DRAFT_KEY } from "../src/lib/quote-draft";

describe("wholesale quote draft", () => {
  it("uses storage separate from the retail cart", () => {
    expect(QUOTE_DRAFT_KEY).toBe("shaw-ev-quote");
    expect(QUOTE_DRAFT_KEY).not.toBe("shaw-ev-lists");
  });

  it("accepts quantities above stock while enforcing the server quantity limit", () => {
    expect(normalizeQuoteQty(500)).toBe(500);
    expect(normalizeQuoteQty(20_000)).toBe(9999);
    expect(normalizeQuoteQty(0)).toBe(1);
  });

  it("merges duplicate products and carries bulk problems into the note", () => {
    const draft = addQuoteLines(
      { lines: [{ productId: "part-a", qty: 12 }], note: "Customer note" },
      [{ productId: "part-a", qty: 488 }, { productId: "part-b", qty: 5 }],
      "Unmatched bulk lines:\nunknown part — Not found",
    );
    expect(draft.lines).toEqual([{ productId: "part-a", qty: 500 }, { productId: "part-b", qty: 5 }]);
    expect(draft.note).toContain("unknown part");
  });

  it("sanitizes malformed stored drafts", () => {
    expect(normalizeQuoteDraft({ lines: null, note: 42 })).toEqual({ lines: [], note: "42" });
    expect(normalizeQuoteDraft(null)).toEqual(EMPTY_QUOTE_DRAFT);
  });

  it("maps customer statuses to plain-language translation keys", () => {
    expect(customerQuoteStatus("submitted")).toBe("quote.statusAwaiting");
    expect(customerQuoteStatus("priced")).toBe("quote.statusReady");
    expect(customerQuoteStatus("rejected")).toBe("quote.statusDeclined");
    expect(customerQuoteStatus("expired")).toBe("quote.statusExpired");
  });
});