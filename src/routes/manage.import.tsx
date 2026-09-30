import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ListPager, MANAGE_PAGE_SIZE } from "@/components/manage/ListPager";
import { SparkRing } from "@/components/site/SparkLoaders";
import { applyCatalogueCsv, exportCatalogueCsv, listCatalogueImports, previewCatalogueCsv, type CsvPreview } from "@/lib/catalogue-admin.functions";

export const Route = createFileRoute("/manage/import")({
  head: () => ({ meta: [{ title: "Price list — Manager Panel" }, { name: "robots", content: "noindex" }] }),
  component: ImportPage,
});

function ImportPage() {
  const queryClient = useQueryClient();
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const { data: history, isFetching: historyBusy } = useQuery({
    queryKey: ["catalogue-imports", historyPage],
    queryFn: () => listCatalogueImports({ data: { page: historyPage, pageSize: MANAGE_PAGE_SIZE } }),
    enabled: historyOpen,
    placeholderData: (previous) => previous,
  });

  const download = async () => {
    setBusy(true);
    const res = await exportCatalogueCsv();
    setBusy(false);
    const url = URL.createObjectURL(new Blob([res.csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `shaw-traders-catalogue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${res.rows} products downloaded`);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setFileName(file.name);
    setBusy(true);
    const res = await previewCatalogueCsv({ data: { csv: text } });
    setBusy(false);
    setPreview(res);
    if (res.error) toast.error(res.error);
  };

  const apply = async () => {
    setBusy(true);
    const res = await applyCatalogueCsv({ data: { csv } });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Could not import");
    toast.success(`${res.saved} products updated`);
    setPreview(null);
    setCsv("");
    setFileName("");
    setHistoryPage(0);
    await queryClient.invalidateQueries({ queryKey: ["catalogue-imports"] });
  };

  return (
    <div className="grid max-w-3xl gap-5">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">1. Download your price list</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You get one row per product with its code, price, MRP, stock, reorder level and HSN code. Open it in Excel or Google Sheets, fill the
          columns in, and save it back as CSV.
        </p>
        <Button className="mt-3" variant="outline" disabled={busy} onClick={() => void download()}>Download price list</Button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-base font-bold">2. Upload the filled sheet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Nothing changes until you check the list below and confirm.</p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-3 block w-full text-sm"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        {fileName && <p className="mt-2 text-xs text-muted-foreground">{fileName}</p>}
      </section>

      {preview && !preview.error && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-base font-bold">3. Check what will change</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {preview.changes.length} change{preview.changes.length === 1 ? "" : "s"} across {preview.rows} rows · {preview.unchanged} rows already
            match{preview.unknownSkus.length > 0 ? ` · ${preview.unknownSkus.length} unknown product codes will be skipped` : ""}.
          </p>

          {preview.unknownSkus.length > 0 && (
            <p className="mt-2 rounded-xl bg-surface p-3 text-xs text-muted-foreground">
              Not found: {preview.unknownSkus.join(", ")}
            </p>
          )}

          {preview.duplicates.length > 0 && (
            <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-semibold">
                {preview.duplicates.length} SKU{preview.duplicates.length === 1 ? "" : "s"} appear more than once in your file — fix these before importing:
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {preview.duplicates.map((duplicate) => <li key={duplicate.sku}>{duplicate.sku} — rows {duplicate.rows.join(", ")}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-2">Row</th><th className="p-2">Product</th><th className="p-2">What</th><th className="p-2">Now</th><th className="p-2">New</th></tr>
              </thead>
              <tbody>
                {preview.changes.map((c, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="p-2 text-muted-foreground">{c.row ?? "—"}</td>
                    <td className="p-2">{c.name}<span className="block text-xs text-muted-foreground">{c.sku}</span></td>
                    <td className="p-2 text-muted-foreground">{c.field}</td>
                    <td className="p-2">{c.from}</td>
                    <td className="p-2 font-semibold text-primary">{c.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <Button disabled={busy || preview.changes.length === 0 || preview.duplicates.length > 0} onClick={() => void apply()}>
              {busy ? <SparkRing /> : null}{busy ? "Saving…" : `Apply ${preview.changes.length} changes`}
            </Button>
            <Button variant="ghost" onClick={() => { setPreview(null); setCsv(""); setFileName(""); }}>Cancel</Button>
          </div>
        </section>
      )}

      <Accordion type="single" collapsible value={historyOpen ? "imports" : ""} onValueChange={(value) => { setHistoryOpen(value === "imports"); if (value !== "imports") setHistoryPage(0); }}>
        <AccordionItem value="imports" className="rounded-lg border border-border bg-card px-4">
          <AccordionTrigger className="hover:no-underline">
            <span className="text-left"><span className="block font-display font-bold">Recent imports</span><span className="block text-xs font-normal text-muted-foreground">Review previous price-list updates</span></span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 border-t border-border pt-4">
            {historyBusy && !history ? <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><SparkRing /> Loading imports…</div> : null}
            {!historyBusy && history?.items.length === 0 ? <p className="py-4 text-sm text-muted-foreground">No price-list imports have been recorded yet.</p> : null}
            <Accordion type="multiple" className="space-y-2">
              {(history?.items ?? []).map((entry) => (
                <AccordionItem key={entry.id} value={entry.id} className="rounded-lg border border-border px-3">
                  <AccordionTrigger className="gap-3 hover:no-underline">
                    <span className="min-w-0 text-left">
                      <span className="block text-sm font-semibold">{entry.saved} product{entry.saved === 1 ? "" : "s"} updated</span>
                      <span className="block truncate text-xs font-normal text-muted-foreground">{new Date(entry.createdAt).toLocaleString("en-IN")} · {entry.actor ?? "Unknown staff member"}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-border pt-3">
                    {entry.changes.length === 0 ? <p className="text-xs text-muted-foreground">No field-level details were stored for this import.</p> : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Row</th><th className="p-2">Product</th><th className="p-2">What</th><th className="p-2">Now</th><th className="p-2">New</th></tr></thead>
                          <tbody>{entry.changes.map((change, index) => <tr key={`${change.sku}-${change.field}-${index}`} className="border-t border-border"><td className="p-2 text-muted-foreground">{change.row ?? "—"}</td><td className="p-2">{change.name}<span className="block text-xs text-muted-foreground">{change.sku}</span></td><td className="p-2 text-muted-foreground">{change.field}</td><td className="p-2">{change.from}</td><td className="p-2 font-semibold text-primary">{change.to}</td></tr>)}</tbody>
                        </table>
                      </div>
                    )}
                    {entry.saved > entry.changes.length && <p className="mt-2 text-xs text-muted-foreground">Showing the first {entry.changes.length} of {entry.saved} changes.</p>}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <ListPager page={historyPage} total={history?.total ?? 0} busy={historyBusy} onPage={setHistoryPage} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
