import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProductCard } from "@/components/site/ProductCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  deleteManagedCustomerAddress,
  manageCustomerDetail,
  saveManagedCustomerAddress,
  updateManagedCustomer,
  type ManageCustomerAddress,
} from "@/lib/manage-data.functions";
import { formatINR, statusLabel, type Product } from "@/lib/catalog";
import { productsByIdsQuery, productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/manage/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer details — Shaw Traders EV" },
      { name: "description", content: "Customer account, addresses, orders and products for authorized Shaw Traders EV staff." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Customer details — Shaw Traders EV" },
      { property: "og:description", content: "Customer account and ordering details for authorized Shaw Traders EV staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageCustomerPage,
});

type AccountForm = {
  customerType: "retail" | "trade";
  priceTier: "retail" | "trade" | "distributor";
  creditLimit: string;
  paymentTermsDays: string;
};

const EMPTY_ADDRESS = {
  id: "",
  line1: "",
  landmark: "",
  city: "",
  state: "West Bengal",
  pincode: "",
  isDefault: false,
};

function ManageCustomerPage() {
  const { customerId } = Route.useParams();
  const { staff } = Route.useRouteContext();
  const canEdit = staff.role === "super_admin";
  const queryClient = useQueryClient();
  const [account, setAccount] = useState<AccountForm>({ customerType: "retail", priceTier: "retail", creditLimit: "0", paymentTermsDays: "0" });
  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  const detailQuery = useQuery({
    queryKey: ["manage-customer", customerId],
    queryFn: () => manageCustomerDetail({ data: { customerId } }),
  });
  const customer = detailQuery.data;

  useEffect(() => {
    if (!customer) return;
    setAccount({
      customerType: customer.customerType,
      priceTier: customer.priceTier,
      creditLimit: String(customer.creditLimit),
      paymentTermsDays: String(customer.paymentTermsDays),
    });
  }, [customer]);

  const purchasedIds = useMemo(
    () => [...new Set((customer?.orders ?? []).flatMap((order) => order.items.map((item) => item.productId)).filter((id): id is string => Boolean(id)))],
    [customer],
  );
  const purchasedQuery = useQuery(productsByIdsQuery(purchasedIds));
  const catalogueQuery = useQuery(productsQuery({ q: term, pageSize: 12, inStock: false }));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["manage-customer", customerId] });
  const saveAccount = useMutation({
    mutationFn: () => updateManagedCustomer({ data: { customerId, customerType: account.customerType, priceTier: account.priceTier, creditLimit: Number(account.creditLimit), paymentTermsDays: Number(account.paymentTermsDays) } }),
    onSuccess: () => { void refresh(); void queryClient.invalidateQueries({ queryKey: ["manage-customers"] }); toast.success("Customer account updated"); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update the customer"),
  });
  const saveAddress = useMutation({
    mutationFn: () => saveManagedCustomerAddress({ data: { customerId, addressId: address.id || undefined, line1: address.line1, landmark: address.landmark, city: address.city, state: address.state, pincode: address.pincode, isDefault: address.isDefault } }),
    onSuccess: () => { setAddress(EMPTY_ADDRESS); void refresh(); toast.success("Address saved"); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save the address"),
  });
  const deleteAddress = useMutation({
    mutationFn: (addressId: string) => deleteManagedCustomerAddress({ data: { customerId, addressId } }),
    onSuccess: () => { setAddress(EMPTY_ADDRESS); void refresh(); toast.success("Address removed"); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove the address"),
  });

  if (detailQuery.isPending) return <div className="h-96 animate-pulse rounded-2xl bg-muted" />;
  if (!customer) return <div className="space-y-4"><p className="text-sm text-muted-foreground">Customer not found.</p><Button variant="outline" asChild><Link to="/manage/customers">Back to customers</Link></Button></div>;

  const editAddress = (item: ManageCustomerAddress) => setAddress({ id: item.id, line1: item.line1, landmark: item.landmark, city: item.city, state: item.state, pincode: item.pincode, isDefault: item.isDefault });

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <Button variant="ghost" size="sm" asChild><Link to="/manage/customers"><ArrowLeft className="size-4" /> Customers</Link></Button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">{customer.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{customer.email || "No email"} · {customer.phone || "No phone"}</p>
          </div>
          {!canEdit && <span className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground">View only</span>}
        </div>
      </header>

      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h3 className="font-display text-lg font-bold">Account and pricing</h3>
          <p className="text-sm text-muted-foreground">Identity details are locked. Only a Super Admin can change these account terms.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Account type"><Select disabled={!canEdit} value={account.customerType} onValueChange={(value: "retail" | "trade") => setAccount((current) => ({ ...current, customerType: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="retail">Retail</SelectItem><SelectItem value="trade">Trade</SelectItem></SelectContent></Select></Field>
          <Field label="Price tier"><Select disabled={!canEdit} value={account.priceTier} onValueChange={(value: "retail" | "trade" | "distributor") => setAccount((current) => ({ ...current, priceTier: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="retail">Retail</SelectItem><SelectItem value="trade">Trade</SelectItem><SelectItem value="distributor">Distributor</SelectItem></SelectContent></Select></Field>
          <Field label="Credit limit"><Input disabled={!canEdit} type="number" min="0" max="100000000" value={account.creditLimit} onChange={(event) => setAccount((current) => ({ ...current, creditLimit: event.target.value }))} /></Field>
          <Field label="Payment terms (days)"><Input disabled={!canEdit} type="number" min="0" max="365" value={account.paymentTermsDays} onChange={(event) => setAccount((current) => ({ ...current, paymentTermsDays: event.target.value }))} /></Field>
        </div>
        {canEdit && <Button disabled={saveAccount.isPending} onClick={() => saveAccount.mutate()}><Save className="size-4" /> Save account</Button>}
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h3 className="font-display text-lg font-bold">Saved addresses</h3>
          <p className="text-sm text-muted-foreground">{customer.addresses.length ? `${customer.addresses.length} saved address(es)` : "No saved addresses yet."}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {customer.addresses.map((item) => (
            <article key={item.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-medium"><MapPin className="mr-1 inline size-4" />{item.line1}</p><p className="mt-1 text-sm text-muted-foreground">{item.landmark ? `${item.landmark}, ` : ""}{item.city}, {item.state} – {item.pincode}</p>{item.isDefault && <p className="mt-2 text-xs font-semibold text-primary">Default address</p>}</div>
                {canEdit && <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => editAddress(item)}>Edit</Button><Button size="icon" variant="ghost" aria-label="Delete address" onClick={() => deleteAddress.mutate(item.id)}><Trash2 className="size-4" /></Button></div>}
              </div>
            </article>
          ))}
        </div>
        {canEdit && (
          <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
            <h4 className="font-semibold">{address.id ? "Edit address" : "Add address"}</h4>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Address"><Input value={address.line1} onChange={(event) => setAddress((current) => ({ ...current, line1: event.target.value }))} /></Field><Field label="Landmark"><Input value={address.landmark} onChange={(event) => setAddress((current) => ({ ...current, landmark: event.target.value }))} /></Field><Field label="City"><Input value={address.city} onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} /></Field><Field label="State"><Input value={address.state} onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value }))} /></Field><Field label="Pincode"><Input inputMode="numeric" maxLength={6} value={address.pincode} onChange={(event) => setAddress((current) => ({ ...current, pincode: event.target.value.replace(/\D/g, "").slice(0, 6) }))} /></Field><label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><Checkbox checked={address.isDefault} onCheckedChange={(checked) => setAddress((current) => ({ ...current, isDefault: checked === true }))} /> Default address</label></div>
            <div className="flex gap-2"><Button disabled={saveAddress.isPending} onClick={() => saveAddress.mutate()}>{address.id ? <Save className="size-4" /> : <Plus className="size-4" />} {address.id ? "Save address" : "Add address"}</Button>{address.id && <Button variant="outline" onClick={() => setAddress(EMPTY_ADDRESS)}>Cancel</Button>}</div>
          </div>
        )}
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div><h3 className="font-display text-lg font-bold">Order history</h3><p className="text-sm text-muted-foreground">{customer.orders.length} order(s) · {formatINR(customer.orders.reduce((sum, order) => sum + order.total, 0))} lifetime value</p></div>
        {customer.orders.length === 0 ? <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">This customer has not placed an order yet.</p> : customer.orders.map((order) => (
          <article key={order.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap justify-between gap-3"><div><Link to="/order/$id" params={{ id: order.id }} search={{ t: order.token }} className="font-semibold text-primary hover:underline">{order.humanId}</Link><p className="text-xs text-muted-foreground">{new Date(order.placedAt).toLocaleDateString("en-IN")} · {statusLabel(order.status)}</p></div><strong>{formatINR(order.total)}</strong></div>
            <ul className="mt-3 space-y-1 text-sm">{order.items.map((item, index) => <li key={`${order.id}-${index}`} className="flex justify-between gap-3"><span>{item.name} × {item.qty}</span><span className="text-muted-foreground">{item.price === null ? "—" : formatINR(item.price * item.qty)}</span></li>)}</ul>
          </article>
        ))}
      </section>

      <ProductSection title="Previously purchased" subtitle="Open full product details or add an available item to this browser’s cart." products={purchasedQuery.data ?? []} empty="No previously purchased products are available in the current catalogue." />

      <section className="space-y-4 border-t border-border pt-6">
        <div><h3 className="font-display text-lg font-bold">Product catalogue</h3><p className="text-sm text-muted-foreground">Products added here go to the signed-in staff browser’s cart, not the customer’s personal cart.</p></div>
        <form className="flex max-w-lg gap-2" onSubmit={(event) => { event.preventDefault(); setTerm(search.trim()); }}><Input aria-label="Search product catalogue" placeholder="Search products, SKU, brand or model" value={search} onChange={(event) => setSearch(event.target.value)} /><Button type="submit" variant="outline"><Search className="size-4" /> Search</Button></form>
        {catalogueQuery.isPending ? <div className="h-64 animate-pulse rounded-lg bg-muted" /> : <ProductGrid products={catalogueQuery.data?.items ?? []} empty="No matching products found." />}
      </section>
    </div>
  );
}

function ProductSection({ title, subtitle, products, empty }: { title: string; subtitle: string; products: Product[]; empty: string }) {
  return <section className="space-y-4 border-t border-border pt-6"><div><h3 className="font-display text-lg font-bold">{title}</h3><p className="text-sm text-muted-foreground">{subtitle}</p></div><ProductGrid products={products} empty={empty} /></section>;
}

function ProductGrid({ products, empty }: { products: Product[]; empty: string }) {
  if (!products.length) return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}