import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeading } from "@/components/site/Empty";
import { useStore } from "@/hooks/useStore";
import { isManagerUnlocked } from "@/lib/manage.functions";
import {
  CATEGORIES,
  ORDER_STATUSES,
  formatINR,
  slugify,
  type Order,
  type OrderStatus,
  type Product,
} from "@/lib/catalog";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { unlocked } = await isManagerUnlocked();
    if (!unlocked) throw redirect({ to: "/manage-login" });
  },
  head: () => ({
    meta: [
      { title: "Admin Panel — Shaw Traders EV" },
      { name: "description", content: "Add EV products, set prices, stock and compatibility, manage coupons and track customer orders for Shaw Traders EV." },
      { property: "og:title", content: "Admin Panel — Shaw Traders EV" },
      { property: "og:description", content: "Manage the Shaw Traders EV catalogue and orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const blank = {
  id: "",
  sku: "",
  name: "",
  category: CATEGORIES[0]!.slug,
  subcategory: "",
  brand: "",
  model: "",
  price: "",
  mrp: "",
  stock: "",
  images: "",
  description: "",
  voltage: "",
  ah: "",
  wattage: "",
  compatibility: "",
  warranty: "",
  weight: "",
  dimensions: "",
  shippingInfo: "",
};

function AdminPage() {
  const { state, upsertProduct, deleteProduct, update } = useStore();
  const [form, setForm] = useState({ ...blank });
  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

  const submit = () => {
    if (!form.name.trim()) return toast.error("Product name is required");
    const product: Product = {
      id: form.id || crypto.randomUUID(),
      sku: form.sku.trim() || slugify(form.name).slice(0, 18).toUpperCase(),
      name: form.name.trim(),
      slug: slugify(form.name),
      category: form.category,
      subcategory: form.subcategory.trim() || undefined,
      brand: form.brand.trim() || undefined,
      model: form.model.trim() || undefined,
      price: num(form.price),
      mrp: num(form.mrp),
      stock: num(form.stock),
      images: form.images.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      description: form.description.trim() || undefined,
      voltage: form.voltage.trim() || undefined,
      ah: form.ah.trim() || undefined,
      wattage: form.wattage.trim() || undefined,
      compatibility: form.compatibility.split(/\n|,/).map((s) => s.trim()).filter(Boolean),
      warranty: form.warranty.trim() || undefined,
      weight: form.weight.trim() || undefined,
      dimensions: form.dimensions.trim() || undefined,
      shippingInfo: form.shippingInfo.trim() || undefined,
      createdAt: Date.now(),
    };
    upsertProduct(product);
    if (product.brand && !state.brands.includes(product.brand)) {
      update((s) => ({ ...s, brands: [...s.brands, product.brand!] }));
    }
    setForm({ ...blank });
    toast.success(form.id ? "Product updated" : "Product added");
  };

  const edit = (p: Product) => {
    setForm({
      id: p.id,
      sku: p.sku,
      name: p.name,
      category: p.category,
      subcategory: p.subcategory ?? "",
      brand: p.brand ?? "",
      model: p.model ?? "",
      price: p.price?.toString() ?? "",
      mrp: p.mrp?.toString() ?? "",
      stock: p.stock?.toString() ?? "",
      images: p.images.join("\n"),
      description: p.description ?? "",
      voltage: p.voltage ?? "",
      ah: p.ah ?? "",
      wattage: p.wattage ?? "",
      compatibility: (p.compatibility ?? []).join("\n"),
      warranty: p.warranty ?? "",
      weight: p.weight ?? "",
      dimensions: p.dimensions ?? "",
      shippingInfo: p.shippingInfo ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setStatus = (order: Order, status: OrderStatus) =>
    update((s) => ({ ...s, orders: s.orders.map((o) => (o.id === order.id ? { ...o, status } : o)) }));

  return (
    <div className="container-page py-10">
      <SectionHeading title="Admin Panel" subtitle="Add products, manage stock and update customer orders." />

      <Tabs defaultValue="products">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="products">Products ({state.products.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({state.orders.length})</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
            <div className="h-fit rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <h3 className="font-display text-base font-bold">{form.id ? "Edit product" : "Add a product"}</h3>
              <div className="mt-4 grid gap-3">
                <Field label="Product name" value={form.name} onChange={(v) => set("name", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="SKU / part no." value={form.sku} onChange={(v) => set("sku", v)} />
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Category</Label>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={form.category}
                      onChange={(e) => set("category", e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Brand" value={form.brand} onChange={(v) => set("brand", v)} />
                  <Field label="Fits model(s)" value={form.model} onChange={(v) => set("model", v)} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Price ₹" value={form.price} onChange={(v) => set("price", v)} type="number" />
                  <Field label="MRP ₹" value={form.mrp} onChange={(v) => set("mrp", v)} type="number" />
                  <Field label="Stock" value={form.stock} onChange={(v) => set("stock", v)} type="number" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Voltage" value={form.voltage} onChange={(v) => set("voltage", v)} />
                  <Field label="Ah" value={form.ah} onChange={(v) => set("ah", v)} />
                  <Field label="Wattage" value={form.wattage} onChange={(v) => set("wattage", v)} />
                </div>
                <Area label="Compatibility (one vehicle per line)" value={form.compatibility} onChange={(v) => set("compatibility", v)} />
                <Area label="Image URLs (one per line)" value={form.images} onChange={(v) => set("images", v)} />
                <Area label="Description" value={form.description} onChange={(v) => set("description", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Warranty" value={form.warranty} onChange={(v) => set("warranty", v)} />
                  <Field label="Weight" value={form.weight} onChange={(v) => set("weight", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Dimensions" value={form.dimensions} onChange={(v) => set("dimensions", v)} />
                  <Field label="Shipping info" value={form.shippingInfo} onChange={(v) => set("shippingInfo", v)} />
                </div>
                <div className="mt-1 flex gap-2">
                  <Button onClick={submit} className="flex-1">{form.id ? "Save changes" : "Add product"}</Button>
                  {form.id && <Button variant="outline" onClick={() => setForm({ ...blank })}>Cancel</Button>}
                </div>
              </div>
            </div>

            <div className="grid h-fit gap-2">
              {state.products.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted-foreground">
                  No products yet. Add your first product using the form.
                </p>
              )}
              {state.products.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sku} · {CATEGORIES.find((c) => c.slug === p.category)?.name} ·{" "}
                      {p.price !== undefined ? formatINR(p.price) : "Price on request"} · Stock {p.stock ?? "—"}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => edit(p)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { deleteProduct(p.id); toast.success("Product deleted"); }}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="grid gap-3">
            {state.orders.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted-foreground">
                No orders yet. Orders placed on the website will appear here.
              </p>
            )}
            {state.orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-bold">{o.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.createdAt).toLocaleString("en-IN")} · {o.address.name} · {o.address.phone}
                    </p>
                  </div>
                  <p className="font-display font-bold">{formatINR(o.total)}</p>
                </div>
                <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  {o.items.map((i) => (
                    <li key={i.productId}>{i.qty} × {i.name}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Label className="text-xs">Status</Label>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={o.status}
                    onChange={(e) => { setStatus(o, e.target.value as OrderStatus); toast.success("Status updated"); }}
                  >
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="text-xs text-muted-foreground">{o.shippingMethod} · {o.paymentMethod}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coupons">
          <CouponManager />
        </TabsContent>

        <TabsContent value="reviews">
          <div className="grid gap-2">
            {state.reviews.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted-foreground">
                No customer reviews yet.
              </p>
            )}
            {state.reviews.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{r.name} · {r.rating}★</p>
                  <p className="text-xs text-muted-foreground">{r.text}</p>
                </div>
                <Button
                  size="sm"
                  variant={r.approved ? "outline" : "default"}
                  onClick={() => update((s) => ({ ...s, reviews: s.reviews.map((x) => (x.id === r.id ? { ...x, approved: !x.approved } : x)) }))}
                >
                  {r.approved ? "Unpublish" : "Approve"}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CouponManager() {
  const { state, update } = useStore();
  const [c, setC] = useState({ code: "", type: "percent", value: "", minOrder: "", expiry: "" });

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="h-fit rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-base font-bold">Create coupon</h3>
        <div className="mt-4 grid gap-3">
          <Field label="Code" value={c.code} onChange={(v) => setC({ ...c, code: v })} />
          <div className="grid gap-1.5">
            <Label className="text-xs">Type</Label>
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value })}>
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed ₹ off</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value" value={c.value} onChange={(v) => setC({ ...c, value: v })} type="number" />
            <Field label="Min order ₹" value={c.minOrder} onChange={(v) => setC({ ...c, minOrder: v })} type="number" />
          </div>
          <Field label="Expiry" value={c.expiry} onChange={(v) => setC({ ...c, expiry: v })} type="date" />
          <Button
            onClick={() => {
              if (!c.code.trim()) return toast.error("Coupon code is required");
              update((s) => ({
                ...s,
                coupons: [
                  ...s.coupons.filter((x) => x.code.toLowerCase() !== c.code.trim().toLowerCase()),
                  { code: c.code.trim().toUpperCase(), type: c.type as "percent" | "fixed", value: Number(c.value || 0), minOrder: Number(c.minOrder || 0), expiry: c.expiry },
                ],
              }));
              setC({ code: "", type: "percent", value: "", minOrder: "", expiry: "" });
              toast.success("Coupon saved");
            }}
          >
            Save coupon
          </Button>
        </div>
      </div>
      <div className="grid h-fit gap-2">
        {state.coupons.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted-foreground">No coupons yet.</p>
        )}
        {state.coupons.map((x) => (
          <div key={x.code} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <span>
              <strong>{x.code}</strong> · {x.type === "percent" ? `${x.value}% off` : `${formatINR(x.value)} off`} · min {formatINR(x.minOrder)}
              {x.expiry && ` · till ${x.expiry}`}
            </span>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => update((s) => ({ ...s, coupons: s.coupons.filter((y) => y.code !== x.code) }))}>
              Remove
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
