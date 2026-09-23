import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/catalog";
import { uploadProductPhoto } from "@/lib/photo-upload";
import { addVehiclePhoto, listVehiclesAdmin, saveVehicle, type AdminVehicleRow, type SaveVehicleInput } from "@/lib/vehicles-admin.functions";
import { EMPTY_PRICE, EMPTY_SPECS } from "@/lib/vehicles";

export const Route = createFileRoute("/manage/scooters")({ component: ManageScooters });

const blank = (): SaveVehicleInput & { coloursText: string } => ({
  name: "",
  brand: "",
  description: "",
  status: "draft",
  stock: 0,
  specs: { ...EMPTY_SPECS },
  price: { ...EMPTY_PRICE },
  coloursText: "",
});

function ManageScooters() {
  const qc = useQueryClient();
  const { data: models } = useQuery({ queryKey: ["admin-vehicles"], queryFn: () => listVehiclesAdmin() });
  const [form, setForm] = useState<SaveVehicleInput & { coloursText: string }>(blank());
  const [msg, setMsg] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () =>
      saveVehicle({
        data: {
          ...form,
          specs: { ...form.specs, coloursText: form.coloursText },
        },
      }),
    onSuccess: (r) => {
      setMsg(r.ok ? "Saved." : (r.error ?? "Could not save."));
      if (r.ok) void qc.invalidateQueries({ queryKey: ["admin-vehicles"] });
    },
  });

  const edit = (v: AdminVehicleRow) =>
    setForm({
      id: v.id,
      name: v.name,
      brand: v.brand ?? "",
      description: "",
      status: v.status,
      stock: v.stock,
      specs: v.specs,
      price: v.price,
      coloursText: v.specs.colours.join(", "),
    });

  const setSpec = (patch: Record<string, unknown>) => setForm((f) => ({ ...f, specs: { ...f.specs, ...patch } }));
  const setPrice = (patch: Record<string, number>) => setForm((f) => ({ ...f, price: { ...f.price, ...patch } }));

  const onRoad =
    (Number(form.price.exShowroom) || 0) +
    (Number(form.price.rto) || 0) +
    (Number(form.price.insurance) || 0) +
    (Number(form.price.accessories) || 0) -
    (Number(form.price.subsidy) || 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h2 className="mb-4 font-display text-lg font-bold">Scooter models</h2>
        <div className="grid gap-3">
          {(models ?? []).map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-surface">
                {v.images[0] && <img src={v.images[0]} alt="" width={64} height={64} className="size-full object-cover" />}
              </div>
              <div className="min-w-40 flex-1">
                <p className="font-semibold">{v.name}</p>
                <p className="text-xs text-muted-foreground">
                  {v.status} · {v.stock} in stock · {v.price.onRoad > 0 ? `${formatINR(v.price.onRoad)} on-road` : "no price yet"}
                </p>
              </div>
              <label className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-primary">
                Add photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const url = await uploadProductPhoto(v.id, file);
                    await addVehiclePhoto({ data: { productId: v.id, url } });
                    void qc.invalidateQueries({ queryKey: ["admin-vehicles"] });
                  }}
                />
              </label>
              <Button size="sm" variant="outline" onClick={() => edit(v)}>Edit</Button>
            </div>
          ))}
          {(models ?? []).length === 0 && <p className="text-sm text-muted-foreground">No scooter models yet. Add the first one on the right.</p>}
        </div>
      </section>

      <aside className="grid gap-3 self-start rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{form.id ? "Edit model" : "New model"}</h2>
          {form.id && <Button size="sm" variant="ghost" onClick={() => setForm(blank())}>New</Button>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="v-name">Model name</Label>
          <Input id="v-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="v-brand">Make</Label>
          <Input id="v-brand" value={form.brand ?? ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="v-desc">Description</Label>
          <Textarea id="v-desc" rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Shown to customers</Label>
            <Select value={form.status ?? "draft"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="v-stock">In stock</Label>
            <Input id="v-stock" inputMode="numeric" value={String(form.stock ?? 0)} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) || 0 })} />
          </div>
        </div>

        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Specification</p>
        {([
          ["variant", "Variant"],
          ["batteryType", "Battery type"],
          ["batteryCapacity", "Battery capacity"],
          ["certifiedRange", "Certified range"],
          ["topSpeed", "Top speed"],
          ["chargingTime", "Charging time"],
          ["motorPower", "Motor power"],
          ["kerbWeight", "Kerb weight"],
        ] as const).map(([key, label]) => (
          <div key={key} className="grid gap-1.5">
            <Label htmlFor={`v-${key}`}>{label}</Label>
            <Input id={`v-${key}`} value={(form.specs[key] as string | null) ?? ""} onChange={(e) => setSpec({ [key]: e.target.value })} />
          </div>
        ))}
        <div className="grid gap-1.5">
          <Label htmlFor="v-colours">Colours (comma separated)</Label>
          <Input id="v-colours" value={form.coloursText} onChange={(e) => setForm({ ...form, coloursText: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="v-wy">Warranty years</Label>
            <Input id="v-wy" inputMode="numeric" value={String(form.specs.warrantyYears ?? "")} onChange={(e) => setSpec({ warrantyYears: Number(e.target.value) || null })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="v-wk">Warranty km</Label>
            <Input id="v-wk" inputMode="numeric" value={String(form.specs.warrantyKm ?? "")} onChange={(e) => setSpec({ warrantyKm: Number(e.target.value) || null })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.specs.registrationRequired !== false}
            onChange={(e) => setSpec({ registrationRequired: e.target.checked })}
          />
          Needs RTO registration
        </label>

        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Price breakdown (₹)</p>
        {([
          ["exShowroom", "Ex-showroom"],
          ["rto", "RTO & registration"],
          ["insurance", "Insurance"],
          ["accessories", "Accessories & handling"],
          ["subsidy", "Subsidy (subtracted)"],
          ["tokenAmount", "Token to book"],
        ] as const).map(([key, label]) => (
          <div key={key} className="grid gap-1.5">
            <Label htmlFor={`p-${key}`}>{label}</Label>
            <Input id={`p-${key}`} inputMode="numeric" value={String(form.price[key] ?? 0)} onChange={(e) => setPrice({ [key]: Number(e.target.value) || 0 })} />
          </div>
        ))}
        <p className="text-sm font-semibold">On-road total: {formatINR(Math.max(0, onRoad))}</p>

        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save model"}</Button>
        {msg && <p className="text-sm font-medium text-primary">{msg}</p>}
      </aside>
    </div>
  );
}
