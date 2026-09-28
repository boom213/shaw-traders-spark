import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SparkRing } from "@/components/site/SparkLoaders";
import type { CsvExportResult } from "@/lib/csv";

export function ExportCsvButton({ onExport, disabled = false }: { onExport: () => Promise<CsvExportResult>; disabled?: boolean }) {
  const [working, setWorking] = useState(false);
  const run = async () => {
    setWorking(true);
    try {
      const result = await onExport();
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
  return <Button type="button" variant="outline" size="sm" disabled={disabled || working} onClick={() => void run()}>{working ? <SparkRing /> : <Download className="size-4" />} Export CSV</Button>;
}