import { CalendarDays, Download, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SparkRing } from "@/components/site/SparkLoaders";
import type { CsvExportResult } from "@/lib/csv";

export type CsvDateRange = { from?: string; to?: string };

export function ExportCsvButton({ onExport, disabled = false, dateRange = false }: { onExport: (range?: CsvDateRange) => Promise<CsvExportResult>; disabled?: boolean; dateRange?: boolean }) {
  const [working, setWorking] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const run = async () => {
    setWorking(true);
    try {
      if (from && to && from > to) throw new Error("From date must be before To date.");
      const result = await onExport({ from: from || undefined, to: to || undefined });
      const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      if (result.truncated) toast.warning("Exported the first 10,000 rows — narrow your filters for the rest.");
      else toast.success(`Exported ${result.rows.toLocaleString("en-IN")} rows`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV export failed");
    } finally {
      setWorking(false);
    }
  };
  const exportButton = <Button type="button" variant="outline" size="sm" disabled={disabled || working} onClick={() => void run()}>{working ? <SparkRing /> : <Download className="size-4" />} Export CSV</Button>;
  if (!dateRange) return exportButton;
  return <div className="flex items-center gap-1">
    <Popover>
      <PopoverTrigger asChild><Button type="button" variant="outline" size="icon" aria-label="Choose export date range"><CalendarDays className="size-4" /></Button></PopoverTrigger>
      <PopoverContent className="pointer-events-auto w-72 space-y-3 p-4" align="end">
        <p className="text-sm font-semibold">Export period</p>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs font-medium text-muted-foreground">From<Input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} /></label><label className="text-xs font-medium text-muted-foreground">To<Input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} /></label></div>
        <div className="flex items-center justify-between"><Button type="button" size="sm" variant="ghost" onClick={() => { setFrom(""); setTo(""); }}><X className="size-4" /> All dates</Button><span className="text-xs text-muted-foreground">Optional</span></div>
      </PopoverContent>
    </Popover>
    {exportButton}
  </div>;
}