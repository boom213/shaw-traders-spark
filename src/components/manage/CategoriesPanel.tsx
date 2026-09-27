import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { categoryIcon, CATEGORY_ICON_REGISTRY } from "@/components/site/category-icons";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { deleteCategory, listAdminCategories, reorderCategories, saveCategory, type AdminCategory } from "@/lib/category-admin.functions";
import { CATEGORY_ICON_KEYS, CATEGORY_ICON_LABELS } from "@/lib/category-icon-keys";

type Draft = { id: string; name: string; slug: string; blurb: string; icon: string };
const EMPTY: Draft = { id: "", name: "", slug: "", blurb: "", icon: "package" };
const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function CategoriesPanel() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({ queryKey: ["admin-categories"], queryFn: () => listAdminCategories() });
  const categories = data ?? [];
  const [draft, setDraft] = useState<Draft | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
      queryClient.invalidateQueries({ queryKey: ["categories"] }),
      queryClient.invalidateQueries({ queryKey: ["home"] }),
    ]);
  };
  const save = useMutation({
    mutationFn: (value: Draft) => saveCategory({ data: value }),
    onSuccess: async (result) => {
      if (!result.ok) return toast.error(result.error);
      toast.success(draft?.id ? "Category updated" : "Category added");
      setDraft(null);
      await refresh();
    },
    onError: () => toast.error("Could not save the category."),
  });
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const ordered = [...categories];
    const current = ordered[index];
    const next = ordered[target];
    if (!current || !next) return;
    ordered[index] = next;
    ordered[target] = current;
    const result = await reorderCategories({ data: { ids: ordered.map((category) => category.id) } });
    if (!result.ok) return toast.error(result.error);
    await refresh();
  };
  const remove = async (category: AdminCategory) => {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    setDeletingId(category.id);
    try {
      const result = await deleteCategory({ data: { id: category.id } });
      if (!result.ok) return toast.error(result.error);
      toast.success("Category deleted");
      await refresh();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-display text-xl font-bold">Categories</h2><p className="text-sm text-muted-foreground">Manage names, icons, and the order customers see.</p></div>
        <Button onClick={() => { setSlugEdited(false); setDraft({ ...EMPTY }); }}><Plus className="size-4" /> Add category</Button>
      </div>
      {isPending && <SparkCharge compact label="Loading categories…" />}
      <div className="grid gap-2">
        {categories.map((category, index) => {
          const Icon = categoryIcon(category);
          return (
            <div key={category.id} className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <span className="grid size-10 place-items-center rounded-lg border border-border bg-surface"><Icon className="size-5" strokeWidth={1.6} /></span>
              <div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-2"><p className="font-semibold">{category.name}</p><p className="text-xs text-muted-foreground">/{category.slug}</p></div><p className="truncate text-xs text-muted-foreground">{category.blurb || "No description"}</p><p className="mt-1 text-xs font-medium">{category.productCount} {category.productCount === 1 ? "product" : "products"}</p></div>
              <div className="flex items-center justify-end gap-1">
                <Button variant="outline" size="icon" aria-label={`Move ${category.name} up`} disabled={index === 0} onClick={() => void move(index, -1)}><ArrowUp className="size-4" /></Button>
                <Button variant="outline" size="icon" aria-label={`Move ${category.name} down`} disabled={index === categories.length - 1} onClick={() => void move(index, 1)}><ArrowDown className="size-4" /></Button>
                <Button variant="outline" size="icon" aria-label={`Edit ${category.name}`} onClick={() => { setSlugEdited(true); setDraft({ id: category.id, name: category.name, slug: category.slug, blurb: category.blurb, icon: category.icon }); }}><Pencil className="size-4" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Delete ${category.name}`} disabled={deletingId === category.id} onClick={() => void remove(category)}>{deletingId === category.id ? <SparkRing /> : <Trash2 className="size-4 text-destructive" />}</Button>
              </div>
            </div>
          );
        })}
      </div>
      <CategoryDialog draft={draft} slugEdited={slugEdited} saving={save.isPending} onClose={() => setDraft(null)} onChange={(patch) => setDraft((current) => current ? { ...current, ...patch } : current)} onNameChange={(name) => setDraft((current) => current ? { ...current, name, ...(!slugEdited ? { slug: slugify(name) } : {}) } : current)} onSlugEdited={() => setSlugEdited(true)} onSave={() => draft && save.mutate(draft)} />
    </div>
  );
}

function CategoryDialog({ draft, slugEdited, saving, onClose, onChange, onNameChange, onSlugEdited, onSave }: { draft: Draft | null; slugEdited: boolean; saving: boolean; onClose: () => void; onChange: (patch: Partial<Draft>) => void; onNameChange: (name: string) => void; onSlugEdited: () => void; onSave: () => void }) {
  const Icon = draft ? categoryIcon(draft) : CATEGORY_ICON_REGISTRY.package;
  return (
    <Dialog open={Boolean(draft)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{draft?.id ? "Edit category" : "Add category"}</DialogTitle><DialogDescription>This category will be available in the shop and product forms.</DialogDescription></DialogHeader>
        {draft && <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label htmlFor="category-name">Name</Label><Input id="category-name" value={draft.name} maxLength={100} onChange={(event) => onNameChange(event.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="category-slug">URL slug</Label><Input id="category-slug" value={draft.slug} maxLength={160} onChange={(event) => { onSlugEdited(); onChange({ slug: slugify(event.target.value) }); }} /><p className="text-xs text-muted-foreground">{slugEdited ? "Custom URL slug" : "Created automatically from the name"}</p></div>
          <div className="grid gap-1.5"><Label htmlFor="category-blurb">Description</Label><Textarea id="category-blurb" value={draft.blurb} maxLength={240} rows={3} onChange={(event) => onChange({ blurb: event.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Icon</Label><Select value={draft.icon} onValueChange={(icon) => onChange({ icon })}><SelectTrigger><span className="flex items-center gap-2"><Icon className="size-4" /><SelectValue /></span></SelectTrigger><SelectContent>{CATEGORY_ICON_KEYS.map((key) => { const OptionIcon = CATEGORY_ICON_REGISTRY[key]; return <SelectItem key={key} value={key}><span className="flex items-center gap-2"><OptionIcon className="size-4" />{CATEGORY_ICON_LABELS[key]}</span></SelectItem>; })}</SelectContent></Select></div>
        </div>}
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={saving || !draft?.name || !draft.slug} onClick={onSave}>{saving ? <SparkRing /> : null}{saving ? "Saving…" : "Save category"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}