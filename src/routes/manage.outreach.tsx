import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, SkipForward, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ListPager } from "@/components/manage/ListPager";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { buildOutreachWhatsAppUrl, deleteOutreachList, listOutreachLists, markOutreachSent, markOutreachSkipped, outreachContacts, uploadOutreachCsv, type OutreachContact, type OutreachListSummary, type OutreachStatus } from "@/lib/outreach.functions";
import { MANAGE_QUERY_OPTIONS } from "@/lib/manage-query";

export const Route = createFileRoute("/manage/outreach")({
  head: () => ({ meta: [
    { title: "Outreach — Shaw Traders EV" },
    { name: "description", content: "Staff-managed contact lists for assisted manual WhatsApp outreach." },
    { property: "og:title", content: "Outreach — Shaw Traders EV" },
    { property: "og:description", content: "Staff-managed contact lists for assisted manual WhatsApp outreach." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: OutreachPage,
});

type UploadSummary = { imported: number; rejected: { row: number; reason: string }[]; duplicatesSkipped: number };

function OutreachPage() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<OutreachListSummary | null>(null);
  const [listName, setListName] = useState("");
  const [fileName, setFileName] = useState("");
  const [csv, setCsv] = useState("");
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OutreachListSummary | null>(null);
  const { data: lists, isPending } = useQuery({ queryKey: ["outreach-lists"], queryFn: () => listOutreachLists(), ...MANAGE_QUERY_OPTIONS });

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) return toast.error("Choose a CSV file.");
    setCsv(await file.text());
    setFileName(file.name);
    setListName((current) => current || file.name.replace(/\.csv$/i, ""));
    setSummary(null);
  };

  const upload = async () => {
    if (!csv) return toast.error("Choose a CSV file.");
    if (!listName.trim()) return toast.error("Enter a list name.");
    setUploading(true);
    const result = await uploadOutreachCsv({ data: { name: listName, csv } }).catch(() => ({ ok: false as const, error: "Could not upload the list." }));
    setUploading(false);
    if (!result.ok) return toast.error(result.error);
    setSummary({ imported: result.imported, rejected: result.rejected, duplicatesSkipped: result.duplicatesSkipped });
    setCsv("");
    setFileName("");
    setListName("");
    if (inputRef.current) inputRef.current.value = "";
    await queryClient.invalidateQueries({ queryKey: ["outreach-lists"] });
    toast.success(`${result.imported} contacts imported`);
  };

  const removeList = async () => {
    if (!deleteTarget) return;
    const result = await deleteOutreachList({ data: { listId: deleteTarget.id, confirmed: true } });
    if (!result.ok) return toast.error(result.error);
    setDeleteTarget(null);
    await queryClient.invalidateQueries({ queryKey: ["outreach-lists"] });
    toast.success("Outreach list deleted");
  };

  if (selected) return <WorkingView list={selected} onBack={() => { setSelected(null); void queryClient.invalidateQueries({ queryKey: ["outreach-lists"] }); }} />;

  return <div className="space-y-5">
    <section className="border-b border-border pb-5">
      <h2 className="font-display text-xl font-bold">Outreach</h2>
      <p className="mt-1 text-sm text-muted-foreground">Upload contacts and open each conversation in WhatsApp. Messages are never sent automatically.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="outreach-name" className="mb-1.5 block text-sm font-medium">List name</label>
            <Input id="outreach-name" value={listName} onChange={(event) => setListName(event.target.value)} placeholder="October customer follow-up" />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">CSV file</span>
            <Button type="button" variant="outline" className="w-full justify-start" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" /> {fileName || "Choose CSV"}
            </Button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => void pickFile(event.target.files?.[0])} />
          </div>
        </div>
        <Button className="self-end" disabled={uploading || !csv || !listName.trim()} onClick={() => void upload()}>
          {uploading ? <SparkRing /> : <Upload className="size-4" />} {uploading ? "Importing…" : "Upload list"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Required CSV columns: phone and message. Optional: name and link. Maximum 5,000 contacts.</p>
      {summary && <div className="mt-4 border-l-4 border-primary bg-surface p-3 text-sm" role="status">
        <p className="font-semibold">{summary.imported} imported · {summary.rejected.length} rejected · {summary.duplicatesSkipped} duplicates skipped</p>
        {summary.rejected.length > 0 && <ul className="mt-2 space-y-1 text-xs text-destructive">{summary.rejected.map((item) => <li key={`${item.row}-${item.reason}`}>Row {item.row}: {item.reason}</li>)}</ul>}
      </div>}
    </section>

    {isPending ? <SparkCharge label="Loading outreach lists…" /> : (lists ?? []).length === 0 ? (
      <p className="border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">No outreach lists yet.</p>
    ) : <div className="overflow-x-auto border border-border bg-card shadow-[var(--shadow-card)]">
      <table className="w-full min-w-[680px] text-sm">
        <caption className="sr-only">Uploaded outreach lists</caption>
        <thead className="bg-surface text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">List</th><th className="p-3">Uploaded</th><th className="p-3">Progress</th><th className="p-3 text-right">Actions</th></tr></thead>
        <tbody>{(lists ?? []).map((list) => <tr key={list.id} className="border-t border-border">
          <td className="p-3"><p className="font-semibold">{list.name}</p><p className="text-xs text-muted-foreground">{list.total.toLocaleString("en-IN")} contacts</p></td>
          <td className="p-3 text-muted-foreground">{new Date(list.createdAt).toLocaleString("en-IN")}</td>
          <td className="p-3"><p>{list.sent.toLocaleString("en-IN")} of {list.total.toLocaleString("en-IN")} opened</p><p className="text-xs text-muted-foreground">{list.pending} pending · {list.skipped} skipped</p></td>
          <td className="p-3"><div className="flex justify-end gap-2"><Button size="sm" onClick={() => setSelected(list)}>Work list</Button><Button size="icon" variant="ghost" aria-label={`Delete ${list.name}`} onClick={() => setDeleteTarget(list)}><Trash2 className="size-4" /></Button></div></td>
        </tr>)}</tbody>
      </table>
    </div>}

    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this outreach list?</AlertDialogTitle><AlertDialogDescription>This permanently removes {deleteTarget?.name ?? "the list"} and all its contact progress. This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep list</AlertDialogCancel><AlertDialogAction onClick={() => void removeList()}>Delete list</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}

function WorkingView({ list, onBack }: { list: OutreachListSummary; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<OutreachStatus | "all">("pending");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [skipTarget, setSkipTarget] = useState<OutreachContact | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [skipping, setSkipping] = useState(false);
  const { data, isPending, isFetching } = useQuery({
    queryKey: ["outreach-contacts", list.id, status, search, page],
    queryFn: () => outreachContacts({ data: { listId: list.id, status, search, page } }),
    placeholderData: (previous) => previous,
    ...MANAGE_QUERY_OPTIONS,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["outreach-contacts", list.id] }),
      queryClient.invalidateQueries({ queryKey: ["outreach-lists"] }),
    ]);
  };

  const markOpened = (contact: OutreachContact) => {
    void markOutreachSent({ data: { contactId: contact.id } }).then(async (result) => {
      if (!result.ok) return toast.error(result.error);
      await refresh();
    }).catch(() => toast.error("WhatsApp opened, but the status could not be updated."));
  };

  const skip = async () => {
    if (!skipTarget) return;
    if (!skipReason.trim()) return toast.error("Enter a short reason.");
    setSkipping(true);
    const result = await markOutreachSkipped({ data: { contactId: skipTarget.id, reason: skipReason } });
    setSkipping(false);
    if (!result.ok) return toast.error(result.error);
    setSkipTarget(null);
    setSkipReason("");
    await refresh();
    toast.success("Contact skipped");
  };

  const counts = data?.counts ?? { pending: list.pending, sent: list.sent, skipped: list.skipped };
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div><Button variant="ghost" size="sm" className="mb-2 px-0" onClick={onBack}><ArrowLeft className="size-4" /> All outreach lists</Button><h2 className="font-display text-xl font-bold">{list.name}</h2><p className="mt-1 text-sm text-muted-foreground">Opening WhatsApp does not send the message. Press Send inside WhatsApp to complete it.</p></div>
      <div className="flex flex-wrap gap-2"><Badge variant="outline">{counts.pending} pending</Badge><Badge>{counts.sent} opened</Badge><Badge variant="secondary">{counts.skipped} skipped</Badge></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()); setPage(0); }}><Input aria-label="Search contacts" placeholder="Search name or phone" value={query} onChange={(event) => setQuery(event.target.value)} /><Button type="submit" variant="outline">Search</Button></form>
      <Select value={status} onValueChange={(value) => { setStatus(value as OutreachStatus | "all"); setPage(0); }}><SelectTrigger aria-label="Filter contacts by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="sent">Opened</SelectItem><SelectItem value="skipped">Skipped</SelectItem><SelectItem value="all">All contacts</SelectItem></SelectContent></Select>
    </div>

    {isPending ? <SparkCharge label="Loading contacts…" /> : (data?.items ?? []).length === 0 ? <p className="border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">No contacts match this view.</p> : <div className="overflow-x-auto border border-border bg-card shadow-[var(--shadow-card)]"><table className="w-full min-w-[760px] text-sm"><caption className="sr-only">Contacts in {list.name}</caption><thead className="bg-surface text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Contact</th><th className="p-3">Message</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody>{(data?.items ?? []).map((contact) => <tr key={contact.id} className="border-t border-border"><td className="p-3"><p className="font-medium">{contact.name ?? "Unnamed contact"}</p><p className="text-xs text-muted-foreground">+{contact.phone}</p></td><td className="max-w-md p-3"><p className="truncate">{contact.message.split(/\r?\n/)[0]}</p>{contact.linkUrl && <p className="truncate text-xs text-muted-foreground">{contact.linkUrl}</p>}</td><td className="p-3"><StatusBadge status={contact.status} />{contact.skipReason && <p className="mt-1 max-w-48 text-xs text-muted-foreground">{contact.skipReason}</p>}</td><td className="p-3"><div className="flex justify-end gap-2"><Button size="sm" asChild><a href={buildOutreachWhatsAppUrl(contact.phone, contact.message, contact.linkUrl)} target="_blank" rel="noopener noreferrer" onClick={() => markOpened(contact)}><MessageCircle className="size-4" /> Send</a></Button><Button size="sm" variant="outline" onClick={() => { setSkipTarget(contact); setSkipReason(""); }}><SkipForward className="size-4" /> Skip</Button></div></td></tr>)}</tbody></table></div>}
    {!isPending && <ListPager page={page} total={data?.total ?? 0} busy={isFetching} onPage={setPage} />}

    <Dialog open={Boolean(skipTarget)} onOpenChange={(open) => { if (!open) { setSkipTarget(null); setSkipReason(""); } }}><DialogContent><DialogHeader><DialogTitle>Skip this contact?</DialogTitle><DialogDescription>Record why {skipTarget?.name ?? "this contact"} was not contacted.</DialogDescription></DialogHeader><div><label htmlFor="skip-reason" className="mb-1.5 block text-sm font-medium">Reason</label><Textarea id="skip-reason" value={skipReason} onChange={(event) => setSkipReason(event.target.value)} maxLength={500} placeholder="For example: asked not to be contacted" /></div><DialogFooter><Button variant="outline" onClick={() => setSkipTarget(null)}>Cancel</Button><Button disabled={skipping || !skipReason.trim()} onClick={() => void skip()}>{skipping ? <SparkRing /> : null}{skipping ? "Saving…" : "Skip contact"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function StatusBadge({ status }: { status: OutreachStatus }) {
  if (status === "sent") return <Badge>Opened</Badge>;
  if (status === "skipped") return <Badge variant="secondary">Skipped</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}