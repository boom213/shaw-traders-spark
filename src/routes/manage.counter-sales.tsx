import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, Download, Minus, MoreVertical, PackagePlus, Plus, ReceiptText, RotateCcw, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SparkCharge, SparkRing } from "@/components/site/SparkLoaders";
import { ListPager } from "@/components/manage/ListPager";
import { ExportCsvButton } from "@/components/manage/ExportCsvButton";
import { AddWholesalerDialog } from "@/components/manage/AddWholesalerDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cancelCounterSale, counterCustomerDetail, counterSaleInvoice, counterSaleSetup, counterSaleStaffInvoice, createCounterSale, listCounterSales, recordCounterPayment, searchCounterCustomers, searchCounterProducts, setChequeStatus, voidCounterSalePayment, type CounterPayment, type CounterProduct, type CounterSale } from "@/lib/counter-sales.functions";
import { placeholderFor } from "@/lib/placeholders";
import { MANAGE_QUERY_OPTIONS } from "@/lib/manage-query";
import { exportCounterSalesCsv } from "@/lib/manage-exports.functions";
import { can } from "@/lib/staff-permissions";
import { counterSaleQuantity, counterSaleShortage } from "@/lib/counter-sale-stock";

export const Route = createFileRoute("/manage/counter-sales")({
  head: () => ({ meta: [{ title: "Counter Sales — Shaw Traders EV Manager" }, { name: "description", content: "Create and manage in-house wholesale counter sales." }, { property: "og:title", content: "Counter Sales — Shaw Traders EV Manager" }, { property: "og:description", content: "Create and manage in-house wholesale counter sales." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: CounterSalesPage,
});

type CartLine = CounterProduct & { qty: number; unitPrice: number };
const money = (value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);

function CounterSalesPage() {
  const { staff } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerTerm, setCustomerTerm] = useState("");
  const [productQuery, setProductQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [invoiceKind, setInvoiceKind] = useState<"gst" | "non_gst">("gst");
  const [overrideReason, setOverrideReason] = useState("");
  const [note, setNote] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [saleTerm, setSaleTerm] = useState("");
  const [salePage, setSalePage] = useState(0);
  const [selectedSale, setSelectedSale] = useState<CounterSale | null>(null);
  const [paymentSale, setPaymentSale] = useState<CounterSale | null>(null);
  const [cancelSale, setCancelSale] = useState<CounterSale | null>(null);
  const [payment, setPayment] = useState({ amount: "", method: "Cash", reference: "", note: "", receivedOn: today(), chequeDate: "", vendorId: "" });
  const [paymentRemaining, setPaymentRemaining] = useState<number | null>(null);
  const [correction, setCorrection] = useState<{ payment: CounterPayment; action: "void" | "bounced" | "cleared" } | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const { data: setup, isPending: setupPending } = useQuery({ queryKey: ["counter-sale-setup"], queryFn: () => counterSaleSetup() });
  const { data: customers = [], isFetching: customersFetching } = useQuery({ queryKey: ["counter-customers", customerTerm], queryFn: () => searchCounterCustomers({ data: { q: customerTerm } }), ...MANAGE_QUERY_OPTIONS });
  const { data: customer } = useQuery({ queryKey: ["counter-customer", customerId], queryFn: () => counterCustomerDetail({ data: { customerId } }), enabled: Boolean(customerId), ...MANAGE_QUERY_OPTIONS });
  const { data: products = [], isFetching: searching } = useQuery({ queryKey: ["counter-products", customerId, searchTerm], queryFn: () => searchCounterProducts({ data: { customerId, q: searchTerm } }), enabled: Boolean(customerId), staleTime: 15_000 });
  const { data: salesData, isPending: salesPending, isFetching: salesFetching } = useQuery({ queryKey: ["counter-sales", saleTerm, salePage], queryFn: () => listCounterSales({ data: { q: saleTerm, page: salePage } }), placeholderData: (previous) => previous, ...MANAGE_QUERY_OPTIONS });
  const sales = salesData?.items ?? [];
  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const tax = invoiceKind === "gst" && setup?.gst.enabled ? (setup.gst.included ? subtotal * setup.gst.rate / (100 + setup.gst.rate) : subtotal * setup.gst.rate / 100) : 0;
  const total = setup?.gst.included || invoiceKind === "non_gst" ? subtotal : subtotal + tax;
  const hasOverride = cart.some((item) => Math.abs(item.unitPrice - (item.wholesalePrice ?? item.retailPrice ?? 0)) > 0.009);
  const stockShortages = cart.filter((item) => counterSaleShortage(item.qty, item.stock) > 0);
  const firstStockShortage = stockShortages[0];
  const warningBalance = (customer?.balance ?? 0) + total;
  const creditWarning = customer && customer.creditLimit > 0 && warningBalance > customer.creditLimit;
  useEffect(() => { setCart([]); setSearchTerm(""); setProductQuery(""); }, [customerId]);
  useEffect(() => {
    if (selectedSale) setSelectedSale(sales.find((sale) => sale.orderId === selectedSale.orderId) ?? null);
    if (paymentSale) setPaymentSale(sales.find((sale) => sale.orderId === paymentSale.orderId) ?? null);
  }, [sales]);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["counter-sales"] }),
     queryClient.invalidateQueries({ queryKey: ["counter-customer"] }),
    queryClient.invalidateQueries({ queryKey: ["counter-products"] }),
    queryClient.invalidateQueries({ queryKey: ["vendor-dashboard"] }),
  ]);
  const createMutation = useMutation({
    mutationFn: () => createCounterSale({ data: { customerId, invoiceKind, overrideReason, note, items: cart.map((item) => ({ productId: item.id, qty: item.qty, unitPrice: item.unitPrice })) } }),
    onSuccess: async (result) => { if (!result.ok) return toast.error(result.error); toast.success(`${result.humanId} created for ${money(result.total)}`); setCart([]); setOverrideReason(""); setNote(""); await refresh(); },
    onError: (error) => toast.error(error.message),
  });
  const paymentMutation = useMutation({
    mutationFn: () => { if (!paymentSale) throw new Error("Choose a sale."); const chequeNote = payment.method === "Cheque" && payment.chequeDate ? `Cheque date: ${payment.chequeDate}${payment.note ? ` · ${payment.note}` : ""}` : payment.note; return recordCounterPayment({ data: { orderId: paymentSale.orderId, amount: Number(payment.amount), method: payment.method, reference: payment.reference, note: chequeNote, receivedOn: payment.receivedOn, vendorId: payment.vendorId } }); },
    onSuccess: async (result) => { if (!result.ok) return toast.error(result.error); toast.success(`Payment recorded · ${money(result.balance)} remaining`); await refresh(); if (result.balance <= 0.009) { setPaymentSale(null); setPaymentRemaining(null); } else { setPaymentRemaining(result.balance); } setPayment((value) => ({ ...value, amount: "", method: "Cash", reference: "", note: "", chequeDate: "", vendorId: "" })); },
    onError: (error) => toast.error(error.message),
  });
  const correctionMutation = useMutation({
    mutationFn: async () => { if (!correction) throw new Error("Choose a payment."); return correction.action === "void" ? voidCounterSalePayment({ data: { paymentId: correction.payment.id, reason: correctionReason } }) : setChequeStatus({ data: { paymentId: correction.payment.id, status: correction.action, clearedOn: correction.action === "cleared" ? today() : undefined, reason: correctionReason } }); },
    onSuccess: async (result) => { if (!result.ok) return toast.error(result.error); toast.success("Payment record updated"); setCorrection(null); setCorrectionReason(""); setSelectedSale(null); await refresh(); },
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
    setCart((current) => current.some((item) => item.id === product.id) ? current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...current, { ...product, qty: 1, unitPrice: price }]);
  }

  function submitUnpaidSale() {
    if (!customerId) return toast.error("Select an approved wholesale customer first.");
    if (cart.length === 0) return toast.error("Add at least one product to the sale.");
    if (hasOverride && overrideReason.trim().length < 3) return toast.error("Add a reason for the price change.");
    createMutation.mutate();
  }

  async function downloadInvoice(sale: CounterSale, staffCopy = false) {
    try {
      const result = await (staffCopy ? counterSaleStaffInvoice : counterSaleInvoice)({ data: { orderId: sale.orderId } });
      if (!("base64" in result)) throw new Error(result.error);
      const binary = atob(result.base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const link = document.createElement("a"); link.href = url; link.download = `${staffCopy ? "staff-invoice" : sale.invoiceKind === "gst" ? "invoice" : "bill"}-${sale.humanId}.pdf`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Invoice download failed."); }
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-border pb-5">
        <div className="flex items-start gap-3"><Banknote className="mt-0.5 size-6 text-primary" /><div><h2 className="font-display text-xl font-bold">Wholesale Counter Sales</h2><p className="mt-1 text-sm text-muted-foreground">Wholesale sales billed at the counter.</p><p className="mt-1 text-sm text-muted-foreground">Create an offline-credit sale for an approved wholesale customer, issue the bill, and record payments later.</p></div></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,.75fr)]">
        <div className="space-y-5">
          <Card title="1. Wholesale customer" icon={<UserRound className="size-4" />}>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row"><form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); setCustomerTerm(customerQuery.trim()); }}><Input aria-label="Search wholesale customers" value={customerQuery} onChange={(event) => setCustomerQuery(event.target.value)} placeholder="Search name, phone or email" /><Button type="submit" variant="outline"><Search className="size-4" /> Search</Button></form><AddWholesalerDialog onDone={async (created) => { await queryClient.invalidateQueries({ queryKey: ["counter-customers"] }); if (created.status === "approved") setCustomerId(created.profileId); }} /></div>
            <select aria-label="Wholesale customer" value={customerId} onChange={(event) => setCustomerId(event.target.value)} disabled={setupPending || customersFetching} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select approved wholesale customer</option>
              {customers.map((item) => <option key={item.id} value={item.id}>{[item.name, item.contactName && item.contactName !== item.name ? item.contactName : "", item.phone || item.email].filter(Boolean).join(" · ")}</option>)}
            </select>
            {customer && <div className="mt-3 grid gap-3 rounded-lg bg-muted/60 p-3 text-sm sm:grid-cols-3"><Stat label="Tier" value={customer.priceTier} /><Stat label="Outstanding" value={money(customer.balance)} /><Stat label="Terms" value={`${customer.paymentTermsDays} days`} />{customer.address && <p className="sm:col-span-3 text-xs text-muted-foreground">{[customer.address.line1, customer.address.landmark, customer.address.city, customer.address.state, customer.address.pincode].filter(Boolean).join(", ")}</p>}</div>}
            {customer?.overdue && <Warning>Customer has overdue invoices. Continue only after offline approval.</Warning>}
          </Card>

          <Card title="2. Add products" icon={<PackagePlus className="size-4" />}>
            {!customerId ? <p className="text-sm text-muted-foreground">Select a wholesale customer first.</p> : <>
              <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearchTerm(productQuery.trim()); }}><Input aria-label="Search sale products" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Search name, SKU, brand or shelf" /><Button type="submit" variant="outline"><Search className="size-4" /> Search</Button></form>
              <div className="mt-3 max-h-80 divide-y overflow-y-auto rounded-lg border">
                {searching ? <p className="p-4 text-sm text-muted-foreground">Searching products…</p> : products.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No available products found.</p> : products.map((product) => <div key={product.id} className="flex items-center gap-3 p-3"><img src={product.image ?? placeholderFor("parts")} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 shrink-0 rounded border object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{product.name}</p><p className="text-xs text-muted-foreground">{product.sku} · Stock {product.stock}{product.rackLocation ? ` · ${product.rackLocation}` : ""}</p><p className="mt-1 text-sm font-semibold text-primary">{product.wholesalePrice == null ? "No wholesale price" : money(product.wholesalePrice)}</p></div><Button size="sm" variant="outline" onClick={() => addProduct(product)}><Plus className="size-4" /> Add</Button></div>)}
              </div>
            </>}
          </Card>

          <Card title="3. Review items" icon={<ReceiptText className="size-4" />}>
            {cart.length === 0 ? <p className="text-sm text-muted-foreground">No products added yet.</p> : <div className="max-h-[32rem] divide-y overflow-y-auto rounded-lg border">{cart.map((item) => { const shortage = counterSaleShortage(item.qty, item.stock); return <div key={item.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(10rem,1fr)_7rem_9rem_7rem] sm:items-center"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-muted-foreground">Default wholesale: {money(item.wholesalePrice ?? item.retailPrice ?? 0)}</p>{shortage > 0 && <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700"><AlertTriangle className="size-3.5 shrink-0" /> Only {item.stock} in stock · shortage {shortage}</p>}</div><div className="flex items-center rounded-md border"><Button type="button" variant="ghost" size="icon" className="size-8 rounded-none" aria-label={`Reduce ${item.name}`} onClick={() => setCart((current) => current.flatMap((line) => line.id !== item.id ? [line] : line.qty <= 1 ? [] : [{ ...line, qty: line.qty - 1 }]))}><Minus className="size-3" /></Button><Input aria-label={`${item.name} quantity`} type="number" inputMode="numeric" min={1} step={1} value={item.qty} className="h-8 min-w-0 flex-1 rounded-none border-y-0 px-1 text-center shadow-none focus-visible:ring-0" onChange={(event) => { const quantity = event.currentTarget.valueAsNumber; if (!Number.isFinite(quantity)) return; setCart((current) => current.map((line) => line.id === item.id ? { ...line, qty: counterSaleQuantity(quantity) } : line)); }} onBlur={(event) => { const quantity = counterSaleQuantity(event.currentTarget.valueAsNumber); setCart((current) => current.map((line) => line.id === item.id ? { ...line, qty: quantity } : line)); }} /><Button type="button" variant="ghost" size="icon" className="size-8 rounded-none" aria-label={`Increase ${item.name}`} onClick={() => setCart((current) => current.map((line) => line.id === item.id ? { ...line, qty: line.qty + 1 } : line))}><Plus className="size-3" /></Button></div><label className="text-xs text-muted-foreground">Unit price<Input aria-label={`${item.name} unit price`} type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => setCart((current) => current.map((line) => line.id === item.id ? { ...line, unitPrice: Number(event.target.value) } : line))} /></label><p className="text-right text-sm font-bold">{money(item.qty * item.unitPrice)}</p></div>; })}</div>}
            {hasOverride && <div className="mt-3"><label className="text-sm font-medium">Price change reason <span className="text-destructive">*</span></label><Input className="mt-1" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Required for audit trail" /></div>}
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card title="Sale summary" icon={<Banknote className="size-4" />}>
            <label className="text-sm font-medium">Document type</label><div className="mt-2 grid grid-cols-2 gap-2"><Button type="button" variant={invoiceKind === "gst" ? "default" : "outline"} onClick={() => setInvoiceKind("gst")} disabled={!setup?.gst.enabled}>GST invoice</Button><Button type="button" variant={invoiceKind === "non_gst" ? "default" : "outline"} onClick={() => setInvoiceKind("non_gst")}>Non-GST bill</Button></div>
            {invoiceKind === "gst" && setup?.gst.enabled && <p className="mt-2 text-xs text-muted-foreground">GST {setup.gst.rate}% · {setup.gst.included ? "included in prices" : "added to prices"}</p>}
            <div className="my-4 space-y-2 border-y py-4 text-sm"><Total label="Subtotal" value={subtotal} /><Total label="Tax" value={tax} /><Total label="Total" value={total} strong /></div>
            {firstStockShortage && <Warning>{stockShortages.length === 1 ? `${firstStockShortage.name} exceeds recorded stock by ${counterSaleShortage(firstStockShortage.qty, firstStockShortage.stock)}.` : `${stockShortages.length} products exceed recorded stock.`} The sale will continue and affected stock will stop at zero.</Warning>}
            {(creditWarning || customer?.overdue) && <Warning>{creditWarning ? `This sale would exceed the ₹${customer?.creditLimit.toLocaleString("en-IN")} credit limit.` : "This customer has an overdue balance."} This is a warning only.</Warning>}
            <label className="mt-3 block text-sm font-medium">Internal sale note</label><Textarea className="mt-1" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional reference or delivery note" />
             <Button className="mt-4 w-full" size="lg" disabled={createMutation.isPending} onClick={submitUnpaidSale}>{createMutation.isPending ? <SparkRing /> : null}{createMutation.isPending ? "Creating sale…" : `Create unpaid sale · ${money(total)}`}</Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">Stock reduces immediately. Payment is not collected online.</p>
          </Card>
        </aside>
      </div>

      <div className="space-y-3 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-lg font-bold">Recent counter sales</h3><p className="text-sm text-muted-foreground">Invoices, outstanding balances, and offline payment records.</p></div><div className="flex w-full gap-2 sm:w-auto">{can(staff.role, "reports") && <ExportCsvButton dateRange onExport={(range) => exportCounterSalesCsv({ data: { q: saleTerm, ...range } })} />}<form className="flex flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); setSaleTerm(saleSearch.trim()); setSalePage(0); }}><Input aria-label="Search counter sales" className="w-full sm:w-72" value={saleSearch} onChange={(event) => setSaleSearch(event.target.value)} placeholder="Search invoice or customer" /><Button type="submit" variant="outline"><Search className="size-4" /></Button></form></div></div>
        <div className="overflow-hidden rounded-lg border bg-card">{salesPending ? <SparkCharge compact label="Loading sales…" /> : sales.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No counter sales found.</p> : sales.map((sale) => <SaleRow key={sale.orderId} sale={sale} onView={() => setSelectedSale(sale)} onPay={() => { setPaymentSale(sale); setPaymentRemaining(sale.balance); setPayment((value) => ({ ...value, amount: sale.balance.toFixed(2) })); }} onInvoice={() => downloadInvoice(sale)} onStaffInvoice={() => downloadInvoice(sale, true)} onCancel={() => setCancelSale(sale)} />)}</div>
        <ListPager page={salePage} total={salesData?.total ?? 0} busy={salesFetching} onPage={setSalePage} />
      </div>

      <AlertDialog open={Boolean(selectedSale)} onOpenChange={(open) => !open && setSelectedSale(null)}><AlertDialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><AlertDialogHeader><AlertDialogTitle>{selectedSale?.humanId} · {selectedSale?.customerName}</AlertDialogTitle><AlertDialogDescription>{selectedSale?.invoiceKind === "gst" ? "GST tax invoice" : "Non-GST bill"} created by {selectedSale?.createdBy}{selectedSale?.createdByEmail ? ` · ${selectedSale.createdByEmail}` : ""}</AlertDialogDescription></AlertDialogHeader>{selectedSale && <SaleDetails sale={selectedSale} onCorrect={setCorrection} />}<AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel><Button variant="outline" onClick={() => selectedSale && downloadInvoice(selectedSale, true)}><Download className="size-4" /> Staff Invoice</Button><Button onClick={() => selectedSale && downloadInvoice(selectedSale)}><Download className="size-4" /> Invoice PDF</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={Boolean(paymentSale)} onOpenChange={(open) => { if (!open) { setPaymentSale(null); setPaymentRemaining(null); setPayment({ amount: "", method: "Cash", reference: "", note: "", receivedOn: today(), chequeDate: "", vendorId: "" }); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Record offline payment</AlertDialogTitle><AlertDialogDescription>{paymentSale?.humanId} · Remaining: {money(paymentRemaining ?? paymentSale?.balance ?? 0)}</AlertDialogDescription></AlertDialogHeader><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Amount<Input type="number" min="0.01" max={paymentRemaining ?? paymentSale?.balance} step="0.01" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></label><label className="text-sm font-medium">Received on<Input type="date" value={payment.receivedOn} onChange={(event) => setPayment({ ...payment, receivedOn: event.target.value })} /></label><label className="text-sm font-medium">Method<select className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value, vendorId: event.target.value === "Vendor" ? payment.vendorId : "" })}><option>Cash</option><option>UPI</option><option>Vendor</option><option>Bank transfer</option><option>Cheque</option><option>Other</option></select></label><label className="text-sm font-medium">{payment.method === "Cheque" ? "Cheque number" : "Reference"}<Input value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} placeholder={["UPI", "Vendor", "Bank transfer", "Cheque"].includes(payment.method) ? "Required" : "Optional reference"} /></label>{payment.method === "Cheque" && <label className="text-sm font-medium sm:col-span-2">Cheque date <span className="font-normal text-muted-foreground">(optional)</span><Input type="date" value={payment.chequeDate} onChange={(event) => setPayment({ ...payment, chequeDate: event.target.value })} /></label>}{payment.method === "Vendor" && <label className="text-sm font-medium sm:col-span-2">Vendor <span className="font-normal text-muted-foreground">(optional)</span><select aria-label="Vendor" className="mt-1 h-10 w-full rounded-md border bg-background px-3" value={payment.vendorId} onChange={(event) => setPayment({ ...payment, vendorId: event.target.value })}><option value="">No vendor selected</option>{setup?.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select><span className="mt-1 block text-xs font-normal text-muted-foreground">Recorded in Vendor Payments.</span></label>}<label className="text-sm font-medium sm:col-span-2">Note<Input value={payment.note} onChange={(event) => setPayment({ ...payment, note: event.target.value })} placeholder="Optional internal note" /></label></div><AlertDialogFooter><AlertDialogCancel>Done</AlertDialogCancel><AlertDialogAction disabled={paymentMutation.isPending || Number(payment.amount) <= 0 || Number(payment.amount) > (paymentRemaining ?? paymentSale?.balance ?? 0) || (["UPI", "Vendor", "Bank transfer", "Cheque"].includes(payment.method) && !payment.reference.trim())} onClick={(event) => { event.preventDefault(); paymentMutation.mutate(); }}>{paymentMutation.isPending ? <SparkRing /> : null}{paymentMutation.isPending ? "Recording…" : "Add payment"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={Boolean(correction)} onOpenChange={(open) => { if (!open) { setCorrection(null); setCorrectionReason(""); } }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{correction?.action === "cleared" ? "Mark cheque cleared?" : correction?.action === "bounced" ? "Mark cheque bounced?" : "Void this payment?"}</AlertDialogTitle><AlertDialogDescription>{correction?.action === "cleared" ? "This moves the cheque into received funds." : "This restores the invoice balance and keeps the original receipt in its audit history."}</AlertDialogDescription></AlertDialogHeader>{correction?.action !== "cleared" && <label className="text-sm font-medium">Reason<Input className="mt-1" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} placeholder="Required for audit trail" /></label>}<AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction disabled={correctionMutation.isPending || (correction?.action !== "cleared" && correctionReason.trim().length < 3)} onClick={(event) => { event.preventDefault(); correctionMutation.mutate(); }}>{correctionMutation.isPending ? <SparkRing /> : null}Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <AlertDialog open={Boolean(cancelSale)} onOpenChange={(open) => !open && setCancelSale(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancel {cancelSale?.humanId}?</AlertDialogTitle><AlertDialogDescription>This restores all stock and reverses the receivable. Sales with a payment cannot be cancelled.</AlertDialogDescription></AlertDialogHeader><label className="text-sm font-medium">Cancellation reason<Input className="mt-1" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Required for audit trail" /></label><AlertDialogFooter><AlertDialogCancel>Keep sale</AlertDialogCancel><AlertDialogAction disabled={cancelMutation.isPending || cancelReason.length < 3} onClick={(event) => { event.preventDefault(); cancelMutation.mutate(); }}>{cancelMutation.isPending ? <SparkRing /> : null}{cancelMutation.isPending ? "Cancelling…" : "Cancel sale and restore stock"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </section>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5"><h3 className="mb-4 flex items-center gap-2 font-semibold">{icon}{title}</h3>{children}</div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase text-muted-foreground">{label}</p><p className="mt-0.5 font-semibold capitalize">{value}</p></div>; }
function Warning({ children }: { children: React.ReactNode }) { return <div className="mt-3 flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>{children}</p></div>; }
function Total({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) { return <div className={`flex justify-between ${strong ? "text-base font-bold" : ""}`}><span>{label}</span><span>{money(value)}</span></div>; }

function SaleRow({ sale, onView, onPay, onInvoice, onStaffInvoice, onCancel }: { sale: CounterSale; onView: () => void; onPay: () => void; onInvoice: () => void; onStaffInvoice: () => void; onCancel: () => void }) {
  const cancelled = Boolean(sale.cancelledAt);
  return <article className="grid gap-3 border-b p-4 last:border-0 lg:grid-cols-[1fr_1.4fr_.8fr_.8fr_auto] lg:items-center"><div><button className="font-semibold hover:text-primary" onClick={onView}>{sale.humanId}</button><p className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString("en-IN")}</p></div><div><p className="font-medium">{sale.customerName}</p><p className="text-xs text-muted-foreground">{sale.items.length} line{sale.items.length === 1 ? "" : "s"} · {sale.invoiceKind === "gst" ? "GST invoice" : "Non-GST bill"}</p></div><div><p className="text-xs uppercase text-muted-foreground">Total</p><p className="font-semibold">{money(sale.total)}</p></div><div><p className="text-xs uppercase text-muted-foreground">{cancelled ? "Status" : "Balance"}</p><p className={cancelled ? "font-semibold text-muted-foreground" : sale.balance > 0 ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>{cancelled ? "Cancelled" : sale.balance > 0 ? money(sale.balance) : "Paid"}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={onView}>View</Button><Button size="sm" variant="outline" onClick={onInvoice} aria-label="Download customer invoice"><Download className="size-4" /></Button><Button size="sm" variant="outline" onClick={onStaffInvoice}>Staff Invoice</Button>{!cancelled && sale.balance > 0 && <Button size="sm" onClick={onPay}>Payment</Button>}{!cancelled && sale.paid === 0 && <Button aria-label="Cancel sale" size="sm" variant="ghost" onClick={onCancel}><RotateCcw className="size-4" /></Button>}</div></article>;
}

function SaleDetails({ sale, onCorrect }: { sale: CounterSale; onCorrect: (value: { payment: CounterPayment; action: "void" | "bounced" | "cleared" }) => void }) {
  const received = sale.payments.filter((payment) => payment.status === "cleared" && !payment.voidedAt).reduce((sum, payment) => sum + payment.amount, 0);
  const awaiting = sale.payments.filter((payment) => payment.status === "pending" && !payment.voidedAt).reduce((sum, payment) => sum + payment.amount, 0);
  return <TooltipProvider><div className="space-y-4 text-sm"><div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 sm:grid-cols-4"><Stat label="Total" value={money(sale.total)} /><Stat label="Received" value={money(received)} /><Stat label="Awaiting clearance" value={money(awaiting)} /><Stat label="Balance" value={money(sale.balance)} /></div><div><h4 className="mb-2 font-semibold">Products</h4><div className="divide-y rounded-lg border">{sale.items.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-4 p-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku} · {item.qty} × {money(item.price)}</p></div><p className="font-semibold">{money(item.qty * item.price)}</p></div>)}</div></div>{sale.payments.length > 0 && <div><h4 className="mb-2 font-semibold">Payments</h4><div className="divide-y rounded-lg border">{sale.payments.map((payment) => { const inactive = Boolean(payment.voidedAt) || payment.status === "bounced"; return <div key={payment.id} className="flex items-center justify-between gap-4 p-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{payment.method.toLowerCase() === "vendor qr" ? "Vendor" : payment.method}{payment.vendorName ? ` · ${payment.vendorName}` : ""}{payment.reference ? ` · ${payment.reference}` : ""}</p>{payment.voidedAt ? <Tooltip><TooltipTrigger asChild><Badge variant="outline">Voided</Badge></TooltipTrigger><TooltipContent>{payment.voidReason ?? "Payment voided"}</TooltipContent></Tooltip> : payment.status === "pending" ? <Badge variant="outline" className="border-amber-500 text-amber-700">Awaiting clearance</Badge> : payment.status === "bounced" ? <Badge variant="destructive">Bounced</Badge> : <Badge variant="secondary">Cleared</Badge>}</div><p className="text-xs text-muted-foreground">{payment.receivedOn} · {payment.recordedBy}</p></div><div className="flex items-center gap-2"><p className={`font-semibold ${inactive ? "text-muted-foreground line-through" : payment.status === "pending" ? "text-amber-700" : "text-emerald-700"}`}>{money(payment.amount)}</p>{!payment.voidedAt && payment.status !== "bounced" && <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Payment actions"><MoreVertical className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{payment.method.toLowerCase() === "cheque" && payment.status === "pending" && <><DropdownMenuItem onSelect={() => onCorrect({ payment, action: "cleared" })}>Mark cleared</DropdownMenuItem><DropdownMenuItem onSelect={() => onCorrect({ payment, action: "bounced" })}>Mark bounced</DropdownMenuItem></>}<DropdownMenuItem className="text-destructive" onSelect={() => onCorrect({ payment, action: "void" })}>Void payment</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></div>; })}</div></div>}{sale.overrideReason && <p><strong>Price override:</strong> {sale.overrideReason}</p>}{sale.note && <p><strong>Internal note:</strong> {sale.note}</p>}{sale.cancelReason && <Warning>Cancelled: {sale.cancelReason}</Warning>}</div></TooltipProvider>;
}