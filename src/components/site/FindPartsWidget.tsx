import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicle } from "@/hooks/useVehicle";
import { categoriesQuery, vehicleTreeQuery } from "@/lib/queries";

export function FindPartsWidget() {
  const navigate = useNavigate();
  const { data: tree } = useSuspenseQuery(vehicleTreeQuery());
  const { data: categories } = useSuspenseQuery(categoriesQuery());
  const { vehicle, setVehicle } = useVehicle();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");

  // Start from the vehicle the shopper picked last time.
  useEffect(() => {
    if (vehicle && !model) {
      setBrand(vehicle.brand);
      setModel(vehicle.model);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.model]);

  const brands = (tree ?? []).map((b) => b.brand);
  const models = (tree ?? []).find((b) => b.brand === brand)?.models ?? [];

  const show = () => {
    if (model) setVehicle({ brand, model });
    void navigate({ to: "/shop", search: { model: model || undefined, category: category || undefined } });
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-7">
      {vehicle && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-3 text-sm">
          <CheckCircle2 className="size-4 text-primary" />
          <span className="font-medium">Your vehicle: {vehicle.model}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setVehicle(null);
              setBrand("");
              setModel("");
            }}
          >
            Change
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>Vehicle brand</Label>
          <Select
            value={brand}
            onValueChange={(v) => {
              setBrand(v);
              setModel("");
            }}
            disabled={brands.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {brands.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Model</Label>
          <Select value={model} onValueChange={setModel} disabled={!brand}>
            <SelectTrigger>
              <SelectValue placeholder={brand ? "Select model" : "Pick a brand first"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {models.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Part category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Any category" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {(categories ?? []).map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="mt-5" onClick={show} disabled={!model && !category}>
        Show parts that fit
      </Button>

      {brands.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Vehicle details are still being added. Message us on WhatsApp with your vehicle and we will confirm the fit.
        </p>
      )}
    </div>
  );
}
