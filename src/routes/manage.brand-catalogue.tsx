import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { catalogueInfo, catalogueUploadUrl } from "@/lib/brand-catalogue.functions";

export const Route = createFileRoute("/manage/brand-catalogue")({
  head: () => ({ meta: [{ title: "ST Catalogue — Manager Panel" }, { name: "robots", content: "noindex" }] }),
  component: CataloguePage,
});

type Info = Awaited<ReturnType<typeof catalogueInfo>>;

function CataloguePage() {
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clear = () => { setFile(null); if (inputRef.current) inputRef.current.value = ""; };
  const pick = (f?: File) => {
    if (!f) return;
    if (f.type !== "application/pdf") { clear(); return void toast.error("Please choose a PDF file"); }
    if (f.size > 20 * 1024 * 1024) { clear(); return void toast.error("PDF must be under 20 MB"); }
    setFile(f);
  };
  const load = () => void catalogueInfo().then(setInfo).catch(() => setInfo(null));
  useEffect(load, []);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const { path, token } = await catalogueUploadUrl();
      const { error } = await supabase.storage.from("product-photos").uploadToSignedUrl(path, token, file, { contentType: "application/pdf" });
      if (error) throw new Error(error.message);
      toast.success("Catalogue updated — customers now download the new PDF");
      clear();
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="max-w-2xl rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-base font-bold">ST brand catalogue (PDF)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This is the file customers get from "Download Catalogue" on the ST brand page.
      </p>
      <p className="mt-3 text-sm">
        {info?.uploadedAt
          ? `Current file uploaded ${new Date(info.uploadedAt).toLocaleString("en-IN")}${info.size ? ` · ${(info.size / 1048576).toFixed(1)} MB` : ""}`
          : "No catalogue uploaded yet — customers see a “coming soon” placeholder."}
      </p>
      {info?.superAdmin ? (
        <div className="mt-4 grid gap-3">
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {!file ? (
            <Button variant="outline" className="w-fit" disabled={busy} onClick={() => inputRef.current?.click()}>
              <FileText className="size-4" /> Choose PDF
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-primary" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{(file.size / 1048576).toFixed(1)} MB</span>
                <button type="button" aria-label="Remove file" disabled={busy} onClick={clear} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-muted">
                  <X className="size-4" />
                </button>
              </span>
              <Button disabled={busy} onClick={() => void upload()}>
                <Upload className="size-4" /> {busy ? "Uploading…" : "Upload"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Only a super admin can upload a new catalogue.</p>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" asChild><a href="/api/public/catalogue" target="_blank" rel="noreferrer">View current PDF</a></Button>
      </div>
    </section>
  );
}
