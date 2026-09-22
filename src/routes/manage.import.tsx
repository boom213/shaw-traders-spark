import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { applyCatalogueCsv, exportCatalogueCsv, previewCatalogueCsv, type CsvPreview } from "@/lib/catalogue-admin.functions";

export const Route = createFileRoute("/manage/import")({
  head: () => ({ meta: [{ title: "Price list — Manager Panel" }, { name: "robots", content: "noindex" }] }),
  component: ImportPage,
});

function ImportPage() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [busy, setBusy] = useState(false);

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

          <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-2">Product</th><th className="p-2">What</th><th className="p-2">Now</th><th className="p-2">New</th></tr>
              </thead>
              <tbody>
                {preview.changes.map((c, i) => (
                  <tr key={i} className="border-t border-border">
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
            <Button disabled={busy || preview.changes.length === 0} onClick={() => void apply()}>
              {busy ? "Saving…" : `Apply ${preview.changes.length} changes`}
            </Button>
            <Button variant="ghost" onClick={() => { setPreview(null); setCsv(""); setFileName(""); }}>Cancel</Button>
          </div>
        </section>
      )}
    </div>
  );
}
