import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { manageCustomers } from "@/lib/manage-data.functions";
import { BUSINESS, formatINR, whatsappLink } from "@/lib/catalog";

export const Route = createFileRoute("/manage/customers")({
  component: ManageCustomers,
});

function ManageCustomers() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");

  const { data: customers, isPending } = useQuery({
    queryKey: ["manage-customers", term],
    queryFn: () => manageCustomers({ data: { q: term } }),
  });

  return (
    <div className="space-y-4">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(q.trim());
        }}
      >
        <Input placeholder="Search customers by name, phone or city" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      {isPending ? (
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      ) : (customers ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          No customers yet. Everyone who places an order on the website will be listed here with their phone number and order history.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Customer</th>
                <th className="p-3">Phone</th>
                <th className="p-3">City</th>
                <th className="p-3">Orders</th>
                <th className="p-3">Total value</th>
                <th className="p-3">Last order</th>
                <th className="p-3">Contact</th>
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((c) => (
                <tr key={c.phone} className="border-t border-border">
                  <td className="p-3 font-medium">
                    {c.name}
                    {c.email && <span className="block text-xs text-muted-foreground">{c.email}</span>}
                  </td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3">{c.city ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1.5">
                      {c.orders.map((o) => (
                        <span key={o.humanId} className="rounded-md bg-surface px-2 py-0.5 text-xs">{o.humanId}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">{formatINR(c.spend)}</td>
                  <td className="p-3 text-muted-foreground">{new Date(c.last).toLocaleDateString("en-IN")}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <a href={`tel:${c.phone}`} className="text-primary hover:underline">Call</a>
                      <a
                        href={whatsappLink(`Hello ${c.name}, this is ${BUSINESS.name} regarding your order.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        WhatsApp
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
