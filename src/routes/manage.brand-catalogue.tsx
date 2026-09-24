import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const load = () => void catalogueInfo().then(setInfo).catch(() => setInfo(null));
  useEffect(load, []);

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf") return toast.error("Please choose a PDF file");
    if (file.size > 20 * 1024 * 1024) return toast.error("PDF must be under 20 MB");
    setBusy(true);
    try {
      const { path, token } = await catalogueUploadUrl();
      const { error } = await supabase.storage.from("product-photos").uploadToSignedUrl(path, token, file, { contentType: "application/pdf" });
      if (error) throw new Error(error.message);
      toast.success("Catalogue updated — customers now download the new PDF");
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
        <input type="file" accept="application/pdf" disabled={busy} className="mt-4 block w-full text-sm" onChange={(e) => void upload(e.target.files?.[0])} />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Only a super admin can upload a new catalogue.</p>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" asChild><a href="/api/public/catalogue" target="_blank" rel="noreferrer">View current PDF</a></Button>
        {busy && <span className="self-center text-sm text-muted-foreground">Uploading…</span>}
      </div>
    </section>
  );
}
