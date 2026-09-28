import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, MessageCircle, MoreVertical, Printer, ReceiptText, Store } from "lucide-react";
import { toast } from "sonner";
import { OrderTypeTabs } from "@/components/manage/OrderTypeTabs";
import { ListPager } from "@/components/manage/ListPager";
import { customerWhatsApp, downloadPdf, printPackingSlip } from "@/components/manage/order-tools";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_STATUSES, formatINR, statusLabel } from "@/lib/catalog";
import { manageOrderCounts, manageOrders, staffInvoice, type ManageOrder } from "@/lib/manage-data.functions";
import { can } from "@/lib/staff-permissions";

export const Route = createFileRoute("/manage/orders/")({
  head: () => ({ meta: [{ title: "Online Orders — Shaw Traders EV Manager" }, { name: "description", content: "Review and fulfil Shaw Traders EV online retail orders." }, { name: "robots", content: "noindex" }, { property: "og:title", content: "Online Orders — Shaw Traders EV Manager" }, { property: "og:description", content: "Review and fulfil online retail orders." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ManageOrders,
});

function itemValue(order: ManageOrder) { return order.items.reduce((sum, item) => sum + (item.price ?? 0) * item.qty, 0); }
function paymentLabel(value: string) { return value.replaceAll("_", " "); }

function ManageOrders() {
  const { staff } = Route.useRouteContext();
  const showCounterSales = can(staff.role, "counter-sales");
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const ordersQuery = useQuery({ queryKey: ["manage-orders", term, statusFilter, paymentFilter, from, to, page], queryFn: () => manageOrders({ data: { q: term, page, status: statusFilter === "all" ? "" : statusFilter, paymentStatus: paymentFilter === "all" ? "" : paymentFilter, from, to } }), placeholderData: (previous) => previous });
  const countsQuery = useQuery({ queryKey: ["manage-order-counts"], queryFn: () => manageOrderCounts() });
  const orders = ordersQuery.data;
  const changeFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(0); };
  return <div className="space-y-5">
    <OrderTypeTabs showCounterSales={showCounterSales} onlineCount={orders?.total} />
    <div><h2 className="font-display text-xl font-bold">Online Orders</h2><p className="mt-1 text-sm text-muted-foreground">Retail orders placed on the website.</p></div>
    <div className={`grid gap-3 ${showCounterSales ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}>
      <Link to="/manage/orders" className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]"><div><p className="text-sm text-muted-foreground">Online Orders</p><p className="font-display text-2xl font-bold">{countsQuery.data?.newOrders ?? "—"}</p><p className="text-xs text-muted-foreground">New Orders</p></div><ReceiptText className="size-6 text-primary" /></Link>
      {showCounterSales && <Link to="/manage/counter-sales" className="flex items-center justify-between rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]"><div><p className="text-sm text-muted-foreground">Counter Sales</p><p className="font-display text-2xl font-bold">{countsQuery.data?.counterToday ?? "—"}</p><p className="text-xs text-muted-foreground">Today</p></div><Store className="size-6 text-primary" /></Link>}
    </div>
    <form className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_auto_auto_auto_auto_auto]" onSubmit={(event) => { event.preventDefault(); setTerm(q.trim()); setPage(0); }}>
      <Input aria-label="Search online orders" placeholder="Search order, customer or phone" value={q} onChange={(event) => setQ(event.target.value)} />
      <Select value={statusFilter} onValueChange={(value) => changeFilter(setStatusFilter, value)}><SelectTrigger className="w-full xl:w-44" aria-label="Order status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All order statuses</SelectItem>{ALL_STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select>
      <Select value={paymentFilter} onValueChange={(value) => changeFilter(setPaymentFilter, value)}><SelectTrigger className="w-full xl:w-40" aria-label="Payment status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All payments</SelectItem><SelectItem value="needs_review">Needs review</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="refunded">Refunded</SelectItem><SelectItem value="cod_pending">COD pending</SelectItem></SelectContent></Select>
      <Input aria-label="Orders from" type="date" value={from} onChange={(event) => changeFilter(setFrom, event.target.value)} />
      <Input aria-label="Orders to" type="date" min={from || undefined} value={to} onChange={(event) => changeFilter(setTo, event.target.value)} />
      <Button type="submit" variant="outline">Search</Button>
    </form>
    {ordersQuery.isPending && <div className="h-72 animate-pulse rounded-lg bg-muted" />}
    {!ordersQuery.isPending && !(orders?.items.length) && <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground"><p>No online retail orders match these filters.</p>{showCounterSales && <Link to="/manage/counter-sales" className="mt-2 inline-block underline underline-offset-4 hover:text-foreground">Looking for a counter sale? View wholesale counter sales.</Link>}</div>}
    {!!orders?.items.length && <>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block"><table className="w-full min-w-[980px] text-sm"><thead className="border-b bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="p-3">#</th><th className="p-3">Order No.</th><th className="p-3">Customer</th><th className="p-3">Date &amp; Time</th><th className="p-3">Items</th><th className="p-3">Amount</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3 text-right">Actions</th></tr></thead><tbody className="divide-y">{orders.items.map((order, index) => <OrderRow key={order.id} order={order} index={page * 8 + index + 1} />)}</tbody></table></div>
      <div className="grid gap-3 md:hidden">{orders.items.map((order) => <MobileOrder key={order.id} order={order} />)}</div>
    </>}
    <ListPager page={page} total={orders?.total ?? 0} busy={ordersQuery.isFetching} onPage={setPage} />
  </div>;
}

function OrderRow({ order, index }: { order: ManageOrder; index: number }) {
  return <tr className="align-middle hover:bg-muted/30"><td className="p-3 text-muted-foreground">{index}</td><td className="p-3"><p className="font-semibold">{order.humanId}</p><Badge variant="outline" className="mt-1">Online</Badge></td><td className="p-3"><p className="font-medium">{order.address['name'] || "Customer"}</p><p className="text-xs text-muted-foreground">{order.address['phone']}</p></td><td className="p-3 text-muted-foreground">{new Date(order.placedAt).toLocaleString("en-IN")}</td><td className="p-3"><p>{order.items.reduce((sum, item) => sum + item.qty, 0)} item(s)</p><p className="text-xs text-muted-foreground">{formatINR(itemValue(order))}</p></td><td className="p-3 font-semibold">{formatINR(order.total)}</td><td className="p-3"><Badge variant="secondary" className="capitalize">{paymentLabel(order.paymentStatus)}</Badge></td><td className="p-3"><Badge variant={order.needsPaymentReview ? "destructive" : "outline"}>{order.needsPaymentReview ? "Needs review" : statusLabel(order.status)}</Badge></td><td className="p-3"><div className="flex justify-end gap-1"><Button size="sm" variant="outline" asChild><Link to="/manage/orders/$orderId" params={{ orderId: order.id }}>View</Link></Button><OrderMenu order={order} /></div></td></tr>;
}

function MobileOrder({ order }: { order: ManageOrder }) {
  return <article className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]"><Link to="/manage/orders/$orderId" params={{ orderId: order.id }} className="block"><div className="flex items-start justify-between gap-3"><div><p className="font-display font-bold">{order.humanId}</p><p className="mt-1 text-sm">{order.address['name'] || "Customer"}</p><p className="text-xs text-muted-foreground">{order.address['phone']} · {new Date(order.placedAt).toLocaleString("en-IN")}</p></div><p className="font-bold">{formatINR(order.total)}</p></div><div className="mt-3 flex flex-wrap gap-2"><Badge variant="secondary" className="capitalize">{paymentLabel(order.paymentStatus)}</Badge><Badge variant={order.needsPaymentReview ? "destructive" : "outline"}>{order.needsPaymentReview ? "Needs review" : statusLabel(order.status)}</Badge><span className="text-xs text-muted-foreground">{order.items.reduce((sum, item) => sum + item.qty, 0)} item(s)</span></div></Link><div className="mt-3 flex justify-end"><OrderMenu order={order} /></div></article>;
}

function OrderMenu({ order }: { order: ManageOrder }) {
  const getInvoice = useServerFn(staffInvoice);
  return <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label={`More actions for ${order.humanId}`}><MoreVertical className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => { if (!printPackingSlip(order)) toast.error("Allow pop-ups to print the packing slip"); }}><Printer /> Packing slip</DropdownMenuItem><DropdownMenuItem asChild><a href={customerWhatsApp(order)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp customer</a></DropdownMenuItem><DropdownMenuItem onSelect={async () => { const result = await getInvoice({ data: { orderId: order.id } }); if ("error" in result) return toast.error(result.error); downloadPdf(result.base64, result.fileName); }}><Download /> Download invoice</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}