import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, Download, Minus, PackagePlus, Plus, ReceiptText, RotateCcw, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cancelCounterSale, counterSaleInvoice, counterSaleSetup, createCounterSale, listCounterSales, recordCounterPayment, searchCounterProducts, type CounterProduct, type CounterSale } from "@/lib/counter-sales.functions";
import { placeholderFor } from "@/lib/placeholders";

export const Route = createFileRoute("/manage/counter-sales")({
  head: () => ({ meta: [{ title: "Counter Sales — Shaw Traders EV Manager" }, { name: "description", content: "Create and manage in-house wholesale counter sales." }, { name: "robots", content: "noindex" }] }),
  component: CounterSalesPage,
});

type CartLine = CounterProduct & { qty: number; unitPrice: number };
const money = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

function CounterSalesPage() {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [invoiceKind, setInvoiceKind] = useState<"gst" | "non_gst">("gst");
  const [overrideReason, setOverrideReason] = useState("");
  const [note, setNote] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<CounterSale | null>(null);
  const [paymentSale, setPaymentSale] = useState<CounterSale | null>(null);
  const [cancelSale, setCancelSale] = useState<CounterSale | null>(null);
  const [payment, setPayment] = useState({ amount: "", method: "Cash", reference: "", note: "", receivedOn: today() });
  const [cancelReason, setCancelReason] = useState("");
  const { data: setup, isPending: setupPending } = useQuery({ queryKey: ["counter-sale-setup"], queryFn: () => counterSaleSetup() });
  const { data: products = [], isFetching: searching } = useQuery({ queryKey: ["counter-products", customerId, searchTerm], queryFn: () => searchCounterProducts({ data: { customerId, q: searchTerm } }), enabled: Boolean(customerId), staleTime: 15_000 });
  const { data: sales = [], isPending: salesPending } = useQuery({ queryKey: ["counter-sales", saleSearch], queryFn: () => listCounterSales({ data: { q: saleSearch } }) });
  const customer = setup?.customers.find((item) => item.id === customerId);
  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const tax = invoiceKind === "gst" && setup?.gst.enabled ? (setup.gst.included ? subtotal * setup.gst.rate / (100 + setup.gst.rate) : subtotal * setup.gst.rate / 100) : 0;
  const total = setup?.gst.included || invoiceKind === "non_gst" ? subtotal : subtotal + tax;
  const hasOverride = cart.some((item) => Math.abs(item.unitPrice - (item.wholesalePrice ?? item.retailPrice ?? 0)) > 0.009);
  const warningBalance = (customer?.balance ?? 0) + total;
  const creditWarning = customer && customer.creditLimit > 0 && warningBalance > customer.creditLimit;

  useEffect(() => { setCart([]); setSearchTerm(""); setProductQuery(""); }, [customerId]);
  useEffect(() => {
    if (selectedSale) setSelectedSale(sales.find((sale) => sale.orderId === selectedSale.orderId) ?? null);
    if (paymentSale) setPaymentSale(sales.find((sale) => sale.orderId === paymentSale.orderId) ?? null);
  }, [sales]);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["counter-sales"] }),
    queryClient.invalidateQueries({ queryKey: ["counter-sale-setup"] }),
    queryClient.invalidateQueries({ queryKey: ["counter-products"] }),
  ]);
  const createMutation = useMutation({
    mutationFn: () => createCounterSale({ data: { customerId, invoiceKind, overrideReason, note, items: cart.map((item) => ({ productId: item.id, qty: item.qty, unitPrice: item.unitPrice })) } }),
    onSuccess: async (result) => { if (!result.ok) return toast.error(result.error); toast.success(`${result.humanId} created for ${money(result.total)}`); setCart([]); setOverrideReason(""); setNote(""); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const paymentMutation = useMutation({
    mutationFn: () => recordCounterPayment({ data: { orderId: paymentSale!.orderId, amount: Number(payment.amount), method: payment.method, reference: payment.reference, note: payment.note, receivedOn: payment.receivedOn } }),
    onSuccess: async (result) => { if (!result.ok) return toast.error(result.error); toast.success(`Payment recorded · ${money(result.balance)} remaining`); setPaymentSale(null); setPayment({ amount: "", method: "Cash", reference: "", note: "", receivedOn: today() }); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelCounterSale({ data: { orderId: cancelSale!.orderId, reason: cancelReason } }),
    onSuccess: async (result) => { if (!result.ok) return toast.error(result.error); toast.success("Sale cancelled and stock restored"); setCancelSale(null); setCancelReason(""); await refresh(); },
    onError: (error) => toast.error(error.message),
  });

  function addProduct(product: CounterProduct) {
    const price = product.wholesalePrice ?? product.retailPrice;
    if (price == null) return toast.error("This product has no wholesale or retail price.");
    setCart((current) => current.some((item) => item.id === product.id) ? current.map((item) => item.id === product.id ? { ...item, qty: Math.min(item.stock, item.qty + 1) } : item) : [...current, { ...product, qty: 1, unitPrice: price }]);
  }

  async function downloadInvoice(sale: CounterSale) {
    try {
      const result = await counterSaleInvoice({ data: { orderId: sale.orderId } });
      if (!("base64" in result)) throw new Error(result.error);
      const binary = atob(result.base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = `${sale.invoiceKind === "gst" ? "invoice" : "bill"}-${sale.humanId}.pdf`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Invoice download failed."); }
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-border pb-5">
        <div className="flex items-start gap-3"><Banknote className="mt-0.5 size-6 text-primary" /><div><h2 className="font-display text-xl font-bold">Wholesale Counter Sales</h2><p className="mt-1 text-sm text-muted-foreground">Create an offline-credit sale for an approved wholesale customer, issue the bill, and record payments later.</p></div></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,.75fr)]">
        <div className="space-y-5">
          <Card title="1. Wholesale customer" icon={<UserRound className="size-4" />}>
            <select aria-label="Wholesale customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} disabled={setupPending} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select approved wholesale customer</option>
              {(setup?.customers ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.phone || item.email}</option>)}
            </select>
            {customer && <div className="mt-3 grid gap-3 rounded-lg bg-muted/60 p-3 text-sm sm:grid-cols-3"><Stat label="Tier" value={customer.priceTier} /><Stat label="Outstanding" value={money(customer.balance)} /><Stat label="Terms" value={`${customer.paymentTermsDays} days`} />{customer.address && <p className="sm:col-span-3 text-xs text-muted-foreground">{[customer.address.line1, customer.address.landmark, customer.address.city, customer.address.state, customer.address.pincode].filter(Boolean).join(", ")}</p>}</div>}
            {customer?.overdue && <Warning>Customer has overdue invoices. Continue only after offline approval.</Warning>}
          </Card>

          <Card title="2. Add products" icon={<PackagePlus className="size-4" />}>
            {!customerId ? <p className="text-sm text-muted-foreground">Select a wholesale customer first.</p> : <>
              <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearchTerm(productQuery.trim()); }}><Input aria-label="Search sale products" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Search name, SKU, brand or shelf" /><Button type="submit" variant="outline"><Search className="size-4" /> Search</Button></form>
              <div className="mt-3 max-h-80 divide-y overflow-auto rounded-lg border">
                {searching ? <p className="p-4 text-sm text-muted-foreground">Searching products…</p> : products.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No available products found.</p> : products.map((product) => <div key={product.id} className="flex items-center gap-3 p-3"><img src={product.image ?? placeholderFor("parts")} alt="" className="size-12 rounded border object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku} · Stock {product.stock}{product.rackLocation ? ` · ${product.rackLocation}` : ""}</p><p className="mt-1 text-sm font-semibold text-primary">{product.wholesalePrice == null ? "No wholesale price" : money(product.wholesalePrice)}</p></div><Button size="sm" variant="outline" onClick={() => addProduct(product)}><Plus className="size-4" /> Add</Button></div>)}
              </div>
            </>}
          </Card>

          <Card title="3. Review items" icon={<ReceiptText className="size-4" />}>
            {cart.length === 0 ? <p className="text-sm text-muted-foreground">No products added yet.</p> : <div className="divide-y rounded-lg border">{cart.map((item) => <div key={item.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(10rem,1fr)_7rem_9rem_7rem] sm:items-center"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">Default wholesale: {money(item.wholesalePrice ?? item.retailPrice ?? 0)}</p></div><div className="flex items-center rounded-md border"><button aria-label={`Reduce ${item.name}`} className="p-2" onClick={() => setCart((current) => current.flatMap((line) => line.id !== item.id ? [line] : line.qty <= 1 ? [] : [{ ...line, qty: line.qty - 1 }]))}><Minus className="size-3" /></button><span className="flex-1 text-center text-sm">{item.qty}</span><button aria-label={`Increase ${item.name}`} disabled={item.qty >= item.stock} className="p-2 disabled:opacity-40" onClick={() => setCart((current) => current.map((line) => line.id === item.id ? { ...line, qty: Math.min(line.stock, line.qty + 1) } : line))}><Plus className="size-3" /></button></div><label className="text-xs text-muted-foreground">Unit price<Input aria-label={`${item.name} unit price`} type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => setCart((current) => current.map((line) => line.id === item.id ? { ...line, unitPrice: Number(event.target.value) } : line))} /></label><p className="text-right text-sm font-bold">{money(item.qty * item.unitPrice)}</p></div>)}</div>}
            {hasOverride && <div className="mt-3"><label className="text-sm font-medium">Price change reason <span className="text-destructive">*</span></label><Input className="mt-1" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Required for audit trail" /></div>}
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card title="Sale summary" icon={<Banknote className="size-4" />}>
            <label className="text-sm font-medium">Document type</label><div className="mt-2 grid grid-cols-2 gap-2"><Button type="button" variant={invoiceKind === "gst" ? "default" : "outline"} onClick={() => setInvoiceKind("gst")} disabled={!setup?.gst.enabled}>GST invoice</Button><Button type="button" variant={invoiceKind === "non_gst" ? "default" : "outline"} onClick={() => setInvoiceKind("non_gst")}>Non-GST bill</Button></div>
            {invoiceKind === "gst" && setup?.gst.enabled && <p className="mt-2 text-xs text-muted-foreground">GST {setup.gst.rate}% · {setup.gst.included ? "included in prices" : "added to prices"}</p>}
            <div className="my-4 space-y-2 border-y py-4 text-sm"><Total label="Subtotal" value={subtotal} /><Total label="Tax" value={tax} /><Total label="Total" value={total} strong /></div>
            {(creditWarning || customer?.overdue) && <Warning>{creditWarning ? `This sale would exceed the ₹${customer?.creditLimit.toLocaleString("en-IN")} credit limit.` : "This customer has an overdue balance."} This is a warning only.</Warning>}
            <label className="mt-3 block text-sm font-medium">Internal sale note</label><Textarea className="mt-1" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional reference or delivery note" />
            <Button className="mt-4 w-full" size="lg" disabled={!customerId || cart.length === 0 || (hasOverride && overrideReason.length < 3) || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? "Creating sale…" : `Create unpaid sale · ${money(total)}`}</Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Stock reduces immediately. Payment is not collected online.</p>
          </Card>
        </aside>
      </div>

      <div className="space-y-3 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-lg font-bold">Recent counter sales</h3><p className="text-sm text-muted-foreground">Invoices, outstanding balances, and offline payment records.</p></div><Input aria-label="Search counter sales" className="w-full sm:w-72" value={saleSearch} onChange={(event) => setSaleSearch(event.target.value)} placeholder="Search invoice or customer" /></div>
        <div className="overflow-hidden rounded-lg border bg-card">{salesPending ? <p className="p-6 text-sm text-muted-foreground">Loading sales…</p> : sales.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No counter sales found.</p> : sales.map((sale) => <SaleRow key={sale.orderId} sale={sale} onView={() => setSelectedSale(sale)} onPay={() => { setPaymentSale(sale); setPayment((value) => ({ ...value, amount: sale.balance.toFixed(2) })); }} onInvoice={() => downloadInvoice(sale)} onCancel={() => setCancelSale(sale)} />)}</div>
      </div>

      <AlertDialog open={Boolean(selectedSale)} onOpenChange={(open) => !open && setSelectedSale(null)}><AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><AlertDialogHeader><AlertDialogTitle>{selectedSale?.humanId} · {selectedSale?.customerName}</AlertDialogTitle><AlertDialogDescription>{selectedSale?.invoiceKind === "gst" ? "GST tax invoice" : "Non-GST bill"} created by {selectedSale?.createdBy}{selectedSale?.createdByEmail ? ` · ${selectedSale.createdByEmail}` : ""}</AlertDialogDescription></AlertDialogHeader>{selectedSale && <SaleDetails sale={selectedSale} />}<AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel><Button onClick={() => selectedSale && downloadInvoice(selectedSale)}><Download className="size-4" /> Invoice PDF</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={Boolean(paymentSale)} onOpenChange={(open) => !open && setPaymentSale(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Record offline payment</AlertDialogTitle><AlertDialogDescription>{paymentSale?.humanId} · balance {money(paymentSale?.balance ?? 0)}</AlertDialogDescription></AlertDialogHeader><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Amount<Input type="number" min="0.01" max={paymentSale?.balance} step="0.01" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></label><label className="text-sm font-medium">Received on<Input type="date" value={payment.receivedOn} onChange={(event) => setPayment({ ...payment, receivedOn: event.target.value })} /></label><label className="text-sm font-medium">Method<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })}><option>Cash</option><option>UPI</option><option>Bank transfer</option><option>Cheque</option><option>Other</option></select></label><label className="text-sm font-medium">Reference<Input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} placeholder="Optional UTR / cheque no." /></label><label className="text-sm font-medium sm:col-span-2">Note<Input value={payment.note} onChange={(event) => setPayment({ ...payment, note: event.target.value })} placeholder="Optional internal note" /></label></div><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={paymentMutation.isPending || Number(payment.amount) <= 0 || Number(payment.amount) > (paymentSale?.balance ?? 0)} onClick={(event) => { event.preventDefault(); paymentMutation.mutate(); }}>{paymentMutation.isPending ? "Recording…" : "Record payment"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={Boolean(cancelSale)} onOpenChange={(open) => !open && setCancelSale(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel {cancelSale?.humanId}?</AlertDialogTitle><AlertDialogDescription>This restores all stock and reverses the receivable. Sales with a payment cannot be cancelled.</AlertDialogDescription></AlertDialogHeader><label className="text-sm font-medium">Cancellation reason<Input className="mt-1" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Required for audit trail" /></label><AlertDialogFooter><AlertDialogCancel>Keep sale</AlertDialogCancel><AlertDialogAction disabled={cancelMutation.isPending || cancelReason.length < 3} onClick={(event) => { event.preventDefault(); cancelMutation.mutate(); }}>{cancelMutation.isPending ? "Cancelling…" : "Cancel sale and restore stock"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"><h3 className="mb-4 flex items-center gap-2 font-semibold">{icon}{title}</h3>{children}</div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="mt-0.5 font-semibold capitalize">{value}</p></div>; }
function Warning({ children }: { children: React.ReactNode }) { return <div className="mt-3 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>{children}</p></div>; }
function Total({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) { return <div className={`flex justify-between ${strong ? "text-base font-bold" : ""}`}><span>{label}</span><span>{money(value)}</span></div>; }

function SaleRow({ sale, onView, onPay, onInvoice, onCancel }: { sale: CounterSale; onView: () => void; onPay: () => void; onInvoice: () => void; onCancel: () => void }) {
  const cancelled = Boolean(sale.cancelledAt);
  return <article className="grid gap-3 border-b p-4 last:border-0 lg:grid-cols-[1fr_1.4fr_.8fr_.8fr_auto] lg:items-center"><div><button className="font-semibold hover:text-primary" onClick={onView}>{sale.humanId}</button><p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString("en-IN")}</p></div><div><p className="font-medium">{sale.customerName}</p><p className="text-xs text-muted-foreground">{sale.items.length} line{sale.items.length === 1 ? "" : "s"} · {sale.invoiceKind === "gst" ? "GST invoice" : "Non-GST bill"}</p></div><div><p className="text-xs uppercase text-muted-foreground">Total</p><p className="font-semibold">{money(sale.total)}</p></div><div><p className="text-xs uppercase text-muted-foreground">{cancelled ? "Status" : "Balance"}</p><p className={cancelled ? "font-semibold text-muted-foreground" : sale.balance > 0 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>{cancelled ? "Cancelled" : sale.balance > 0 ? money(sale.balance) : "Paid"}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={onView}>View</Button><Button size="sm" variant="outline" onClick={onInvoice}><Download className="size-4" /></Button>{!cancelled && sale.balance > 0 && <Button size="sm" onClick={onPay}>Payment</Button>}{!cancelled && sale.paid === 0 && <Button aria-label="Cancel sale" size="sm" variant="ghost" onClick={onCancel}><RotateCcw className="size-4" /></Button>}</div></article>;
}

function SaleDetails({ sale }: { sale: CounterSale }) {
  return <div className="space-y-4 text-sm"><div className="grid grid-cols-3 gap-3 rounded-lg bg-muted p-3"><Stat label="Total" value={money(sale.total)} /><Stat label="Paid" value={money(sale.paid)} /><Stat label="Balance" value={money(sale.balance)} /></div><div><h4 className="mb-2 font-semibold">Products</h4><div className="divide-y rounded-lg border">{sale.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-4 p-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku} · {item.qty} × {money(item.price)}</p></div><p className="font-semibold">{money(item.qty * item.price)}</p></div>)}</div></div>{sale.payments.length > 0 && <div><h4 className="mb-2 font-semibold">Payments</h4><div className="divide-y rounded-lg border">{sale.payments.map((payment) => <div key={payment.id} className="flex justify-between gap-4 p-3"><div><p className="font-medium">{payment.method}{payment.reference ? ` · ${payment.reference}` : ""}</p><p className="text-xs text-muted-foreground">{payment.receivedOn} · {payment.recordedBy}</p></div><p className="font-semibold text-emerald-700">{money(payment.amount)}</p></div>)}</div></div>}{sale.overrideReason && <p><strong>Price override:</strong> {sale.overrideReason}</p>}{sale.note && <p><strong>Internal note:</strong> {sale.note}</p>}{sale.cancelReason && <Warning>Cancelled: {sale.cancelReason}</Warning>}</div>;
}