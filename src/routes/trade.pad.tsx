import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionHeading } from "@/components/site/Empty";
import { SparkRing } from "@/components/site/SparkLoaders";
import { useCatalogueRateVisibility } from "@/hooks/useTrade";
import { canonical, formatINR } from "@/lib/catalog";
import { bulkLookup, type PadLine } from "@/lib/trade.functions";
import { useQuoteAccess, useQuoteList } from "@/hooks/useQuoteList";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/trade/pad")({
  head: () => ({
    meta: [
      { title: "Bulk Order Pad — Shaw Traders EV" },
      { name: "description", content: "Paste your part numbers and quantities, check availability and trade prices, and add the whole list to your cart in one action." },
      { property: "og:title", content: "Bulk Order Pad — Shaw Traders EV" },
      { property: "og:description", content: "Paste a part list and order in bulk from Shaw Traders EV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: canonical("/trade/pad") }],
  }),
  component: PadPage,
});

function PadPage() {
  const t = useT();
  const quoteAccess = useQuoteAccess();
  const quoteList = useQuoteList();
  const { hideCatalogueRates } = useCatalogueRateVisibility();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [lines, setLines] = useState<PadLine[] | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    setBusy(true);
    const res = await bulkLookup({ data: { text } });
    setBusy(false);
    setLines(res.lines);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    setText(content.slice(0, 20000));
  };

  const ready = (lines ?? []).filter((l) => l.productId && !l.problem);
  const total = ready.reduce((n, l) => n + (l.unitPrice ?? 0) * l.qty, 0);
  const addToQuoteList = () => {
    const problems = (lines ?? []).filter((line) => line.problem).map((line) => `${line.input} — ${line.problem}`);
    const problemNote = problems.length > 0 ? `Unmatched bulk lines:\n${problems.join("\n")}` : undefined;
    quoteList.addMany(ready.flatMap((line) => line.productId ? [{ productId: line.productId, qty: line.qty }] : []), problemNote);
    toast.success(t("quote.added"));
    void navigate({ to: "/trade/quote-list" });
  };

  return (
    <div className="container-page space-y-6 py-10">
      <SectionHeading
        as="h1"
        title="Bulk order pad"
        subtitle="One part per line: part number, then quantity. For example “STE-CHG-60V, 20”."
      />

      {quoteAccess.ready && !quoteAccess.allowed && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
          You are seeing retail prices. <Link className="underline" to="/trade">Open a wholesale account</Link> for trade rates.
        </p>
      )}

      <Textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"STE-CHG-60V, 20\nSTE-BRK-PAD, 50\nrear shocker x 10"}
        aria-label="Part numbers and quantities"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={check} disabled={busy || !text.trim()}>
          {busy ? <SparkRing /> : null} Check availability
        </Button>
        <label className="text-sm text-muted-foreground">
          <span className="cursor-pointer underline">or upload a CSV / text file</span>
          <input type="file" accept=".csv,.txt,text/plain" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
      </div>

      {lines && (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Your bulk order list with availability and prices</caption>
            <thead className="bg-surface text-left">
              <tr>
                <th scope="col" className="px-3 py-2">Line</th>
                <th scope="col" className="px-3 py-2">Part</th>
                <th scope="col" className="px-3 py-2">Qty</th>
                {!hideCatalogueRates && <th scope="col" className="px-3 py-2">Your price</th>}
                <th scope="col" className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={`${l.input}-${i}`} className="border-t border-border">
                  <td className="px-3 py-2 text-muted-foreground">{l.input}</td>
                  <td className="px-3 py-2">{l.name ?? "—"}{l.sku ? <span className="block text-xs text-muted-foreground">{l.sku}</span> : null}</td>
                  <td className="px-3 py-2">{l.qty}</td>
                  {!hideCatalogueRates && <td className="px-3 py-2">{l.unitPrice ? formatINR(l.unitPrice * l.qty) : "Price on request"}</td>}
                  <td className={`px-3 py-2 ${l.problem ? "text-destructive" : "text-primary"}`}>{l.problem ?? "Available"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ready.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
          <p className="text-sm">{ready.length} line(s) ready{hideCatalogueRates ? "" : ` · ${formatINR(total)}`}</p>
          {quoteAccess.allowed ? (
            <Button onClick={addToQuoteList}>
              <FileText className="size-4" /> {t("product.addToQuote")}
            </Button>
          ) : (
            <Button asChild><Link to="/trade"><ShoppingCart className="size-4" /> Contact us to order</Link></Button>
          )}
        </div>
      )}

    </div>
  );
}
