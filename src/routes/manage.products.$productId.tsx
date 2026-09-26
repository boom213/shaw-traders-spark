import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Camera, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getCatalogueProduct,
  setProductImages,
  updateCatalogueProduct,
  type CatalogueProductDetail,
  type UpdateCatalogueProductInput,
} from "@/lib/catalogue-admin.functions";
import { uploadProductPhoto } from "@/lib/photo-upload";
import { categoriesQuery } from "@/lib/queries";

export const Route = createFileRoute("/manage/products/$productId")({
  head: () => ({
    meta: [
      { title: "Edit Product — Shaw Traders EV Manager" },
      { name: "description", content: "Edit a Shaw Traders EV catalogue product." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Edit Product — Shaw Traders EV Manager" },
      { property: "og:description", content: "Edit a Shaw Traders EV catalogue product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductEditorPage,
});

type CompatibilityRow = { vehicleModel: string; yearFrom: string; yearTo: string; variant: string };

type FormState = Omit<UpdateCatalogueProductInput, "price" | "wholesalePrice" | "mrp" | "stock" | "reorderThreshold" | "specs" | "compatibility"> & {
  price: string; wholesalePrice: string; mrp: string; stock: string; reorderThreshold: string; specsText: string; compatibility: CompatibilityRow[];
};

const text = (value: string | null) => value ?? "";
const numberText = (value: number | null) => value === null ? "" : String(value);

function initialForm(product: CatalogueProductDetail): FormState {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    category: product.category,
    subcategory: text(product.subcategory),
    brand: text(product.brand),
    model: text(product.model),
    price: numberText(product.price),
    wholesalePrice: numberText(product.wholesalePrice),
    mrp: numberText(product.mrp),
    stock: String(product.stock),
    reorderThreshold: numberText(product.reorderThreshold),
    rackLocation: text(product.rackLocation),
    status: product.status,
    orderingMode: product.orderingMode ?? "",
    description: text(product.description),
    specsText: JSON.stringify(product.specs, null, 2),
    voltage: text(product.voltage),
    ah: text(product.ah),
    wattage: text(product.wattage),
    warranty: text(product.warranty),
    weight: text(product.weight),
    dimensions: text(product.dimensions),
    shippingInfo: text(product.shippingInfo),
    boxContents: text(product.boxContents),
    hsnCode: text(product.hsnCode),
    compatibility: product.compatibility.map((item) => ({
      vehicleModel: item.vehicleModel,
      yearFrom: numberText(item.yearFrom),
      yearTo: numberText(item.yearTo),
      variant: text(item.variant),
    })),
  };
}

function ProductEditorPage() {
  const { productId } = Route.useParams();
  const { data: categories } = useQuery(categoriesQuery());
  const { data, isPending } = useQuery({
    queryKey: ["catalogue-product", productId],
    queryFn: () => getCatalogueProduct({ data: { id: productId } }),
  });

  if (isPending) return <div className="h-96 animate-pulse rounded-lg bg-muted" />;
  if (!data?.ok) return <div className="rounded-lg border border-border p-8 text-center"><p className="text-sm text-muted-foreground">{data?.error ?? "Product not found."}</p><Button asChild variant="outline" className="mt-4"><Link to="/manage/all-products">Back to All Products</Link></Button></div>;
  return <ProductEditor key={data.product.id} product={data.product} categories={categories ?? []} />;
}

function ProductEditor({ product, categories }: { product: CatalogueProductDetail; categories: { slug: string; name: string }[] }) {
  const queryClient = useQueryClient();
  const saveProduct = useServerFn(updateCatalogueProduct);
  const saveImages = useServerFn(setProductImages);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(() => initialForm(product));
  const [images, setImages] = useState(product.images);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const optionalNumber = (value: string) => value.trim() === "" ? null : Number(value);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    let specs: Record<string, string>;
    try {
      const parsed = JSON.parse(form.specsText || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      specs = Object.fromEntries(Object.entries(parsed).map(([key, value]) => [String(key), String(value)]));
    } catch {
      toast.error("Specifications must be a valid JSON object.");
      return;
    }
    setSaving(true);
    const result = await saveProduct({ data: {
      ...form,
      price: optionalNumber(form.price),
      wholesalePrice: optionalNumber(form.wholesalePrice),
      mrp: optionalNumber(form.mrp),
      stock: Number(form.stock || 0),
      reorderThreshold: optionalNumber(form.reorderThreshold),
      specs,
      compatibility: form.compatibility.map((item) => ({
        vehicleModel: item.vehicleModel,
        yearFrom: optionalNumber(item.yearFrom),
        yearTo: optionalNumber(item.yearTo),
        variant: item.variant,
      })),
    } });
    setSaving(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Product saved");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["catalogue-product", product.id] }),
      queryClient.invalidateQueries({ queryKey: ["all-products-admin"] }),
      queryClient.invalidateQueries({ queryKey: ["catalogue-admin"] }),
      queryClient.invalidateQueries({ queryKey: ["products"] }),
      queryClient.invalidateQueries({ queryKey: ["home"] }),
    ]);
  };

  const persistImages = async (next: string[]) => {
    const previous = images;
    setImages(next);
    const result = await saveImages({ data: { id: product.id, urls: next } });
    if (!result.ok) {
      setImages(previous);
      toast.error(result.error ?? "Could not save photos");
      return false;
    }
    await queryClient.invalidateQueries({ queryKey: ["catalogue-product", product.id] });
    return true;
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files).slice(0, Math.max(0, 8 - images.length))) {
      try { added.push(await uploadProductPhoto(product.id, file)); }
      catch (error) { toast.error(error instanceof Error ? error.message : "A photo could not be uploaded"); }
    }
    if (added.length && await persistImages([...images, ...added].slice(0, 8))) toast.success("Photos added");
    setUploading(false);
  };

  const updateCompatibility = (index: number, key: keyof CompatibilityRow, value: string) => {
    set("compatibility", form.compatibility.map((row, current) => current === index ? { ...row, [key]: value } : row));
  };

  return (
    <form className="space-y-6" onSubmit={(event) => void submit(event)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3"><Link to="/manage/all-products"><ArrowLeft /> All Products</Link></Button>
          <h2 className="font-display text-2xl font-bold">Edit product</h2>
          <p className="mt-1 text-sm text-muted-foreground">Update every catalogue value for {product.name}.</p>
        </div>
        <Button type="submit" disabled={saving || uploading}><Save /> {saving ? "Saving…" : "Save changes"}</Button>
      </div>

      <Section title="Product identity">
        <Field label="Product name"><Input required minLength={2} value={form.name} onChange={(event) => set("name", event.target.value)} /></Field>
        <Field label="Product code (SKU)"><Input required value={form.sku} onChange={(event) => set("sku", event.target.value.toUpperCase())} /></Field>
        <Field label="Product URL"><Input required value={form.slug} onChange={(event) => set("slug", event.target.value)} /></Field>
        <Field label="Category"><select required value={form.category} onChange={(event) => set("category", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose category</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></Field>
        <Field label="Subcategory"><Input value={form.subcategory} onChange={(event) => set("subcategory", event.target.value)} /></Field>
        <Field label="Brand"><Input value={form.brand} onChange={(event) => set("brand", event.target.value)} /></Field>
        <Field label="Model"><Input value={form.model} onChange={(event) => set("model", event.target.value)} /></Field>
        <Field label="HSN code"><Input value={form.hsnCode} onChange={(event) => set("hsnCode", event.target.value)} /></Field>
      </Section>

      <Section title="Pricing and stock">
        <NumberField label="Retail price ₹" value={form.price} onChange={(value) => set("price", value)} />
        <NumberField label="Wholesale price ₹" value={form.wholesalePrice} onChange={(value) => set("wholesalePrice", value)} />
        <NumberField label="MRP ₹" value={form.mrp} onChange={(value) => set("mrp", value)} />
        <NumberField label="Stock" value={form.stock} onChange={(value) => set("stock", value)} integer />
        <NumberField label="Warn at" value={form.reorderThreshold} onChange={(value) => set("reorderThreshold", value)} integer />
        <Field label="Shelf location"><Input value={form.rackLocation} onChange={(event) => set("rackLocation", event.target.value)} /></Field>
        <Field label="Visibility"><select value={form.status} onChange={(event) => set("status", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="visible">Visible</option><option value="draft">Draft</option><option value="hidden">Hidden</option></select></Field>
        <Field label="Ordering"><select value={form.orderingMode} onChange={(event) => set("orderingMode", event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Use category setting</option><option value="full">Online ordering</option><option value="enquiry">Enquiry only</option><option value="browse">Browse only</option></select></Field>
      </Section>

      <Section title="Photos" single>
        <div className="flex flex-wrap gap-3">
          {images.map((url, index) => <div key={url} className="relative size-24 overflow-hidden rounded-md border border-border"><img src={url} alt="" className="size-full object-cover" />{index === 0 && <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Main</span>}<Button type="button" variant="destructive" size="icon" aria-label="Remove photo" className="absolute bottom-1 right-1 size-7" onClick={() => void persistImages(images.filter((item) => item !== url))}><Trash2 /></Button></div>)}
          {!images.length && <div className="grid size-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">No photos</div>}
        </div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={uploading || images.length >= 8} onClick={() => cameraRef.current?.click()}>{uploading ? <Loader2 className="animate-spin" /> : <Camera />} Take photo</Button><Button type="button" variant="outline" disabled={uploading || images.length >= 8} onClick={() => galleryRef.current?.click()}><Plus /> Choose photos</Button></div>
        <input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={(event) => void addPhotos(event.target.files)} />
        <input ref={galleryRef} hidden type="file" accept="image/*" multiple onChange={(event) => void addPhotos(event.target.files)} />
      </Section>

      <Section title="Details" single>
        <Field label="Description"><Textarea rows={6} value={form.description} onChange={(event) => set("description", event.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Voltage"><Input value={form.voltage} onChange={(event) => set("voltage", event.target.value)} /></Field>
          <Field label="Battery capacity (Ah)"><Input value={form.ah} onChange={(event) => set("ah", event.target.value)} /></Field>
          <Field label="Wattage"><Input value={form.wattage} onChange={(event) => set("wattage", event.target.value)} /></Field>
          <Field label="Warranty"><Input value={form.warranty} onChange={(event) => set("warranty", event.target.value)} /></Field>
          <Field label="Weight"><Input value={form.weight} onChange={(event) => set("weight", event.target.value)} /></Field>
          <Field label="Dimensions"><Input value={form.dimensions} onChange={(event) => set("dimensions", event.target.value)} /></Field>
        </div>
        <Field label="Box contents"><Textarea rows={3} value={form.boxContents} onChange={(event) => set("boxContents", event.target.value)} /></Field>
        <Field label="Shipping information"><Textarea rows={3} value={form.shippingInfo} onChange={(event) => set("shippingInfo", event.target.value)} /></Field>
        <Field label="Specifications (JSON)"><Textarea className="font-mono text-xs" rows={8} value={form.specsText} onChange={(event) => set("specsText", event.target.value)} /></Field>
      </Section>

      <Section title="Vehicle compatibility" single>
        <div className="space-y-3">{form.compatibility.map((row, index) => <div key={index} className="grid gap-2 border-b border-border pb-3 sm:grid-cols-[2fr_1fr_1fr_1.5fr_auto]"><Input aria-label={`Vehicle model ${index + 1}`} placeholder="Vehicle model" value={row.vehicleModel} onChange={(event) => updateCompatibility(index, "vehicleModel", event.target.value)} /><Input aria-label={`From year ${index + 1}`} type="number" placeholder="From year" value={row.yearFrom} onChange={(event) => updateCompatibility(index, "yearFrom", event.target.value)} /><Input aria-label={`To year ${index + 1}`} type="number" placeholder="To year" value={row.yearTo} onChange={(event) => updateCompatibility(index, "yearTo", event.target.value)} /><Input aria-label={`Variant ${index + 1}`} placeholder="Variant" value={row.variant} onChange={(event) => updateCompatibility(index, "variant", event.target.value)} /><Button type="button" size="icon" variant="ghost" aria-label={`Remove compatibility ${index + 1}`} onClick={() => set("compatibility", form.compatibility.filter((_, current) => current !== index))}><Trash2 /></Button></div>)}</div>
        <Button type="button" variant="outline" onClick={() => set("compatibility", [...form.compatibility, { vehicleModel: "", yearFrom: "", yearTo: "", variant: "" }])}><Plus /> Add vehicle</Button>
      </Section>

      <div className="flex justify-end border-t border-border pt-5"><Button type="submit" size="lg" disabled={saving || uploading}><Save /> {saving ? "Saving…" : "Save all changes"}</Button></div>
    </form>
  );
}

function Section({ title, children, single = false }: { title: string; children: React.ReactNode; single?: boolean }) {
  return <section className="border-b border-border pb-6"><h3 className="mb-4 font-display text-lg font-bold">{title}</h3><div className={single ? "space-y-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>{children}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}

function NumberField({ label, value, onChange, integer = false }: { label: string; value: string; onChange: (value: string) => void; integer?: boolean }) {
  return <Field label={label}><Input type="number" min="0" step={integer ? "1" : "0.01"} value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}