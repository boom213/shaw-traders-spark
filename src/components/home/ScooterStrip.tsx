import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicle } from "@/hooks/useVehicle";
import { vehicleTreeQuery } from "@/lib/queries";

/** Pick your scooter once — we remember it on every page. */
export function ScooterStrip() {
  const navigate = useNavigate();
  const { data: tree, isPending } = useQuery(vehicleTreeQuery());
  const { vehicle, setVehicle } = useVehicle();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (vehicle) {
      setBrand(vehicle.brand);
      setModel(vehicle.model);
    }
  }, [vehicle?.brand, vehicle?.model]);

  const brands = (tree ?? []).map((b) => b.brand);
  const models = (tree ?? []).find((b) => b.brand === brand)?.models ?? [];

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
            <Bike className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-bold leading-tight">Shop by your scooter</p>
            <p className="text-xs text-muted-foreground">We keep your choice for next time.</p>
          </div>
        </div>

        <div className="grid min-w-40 flex-1 gap-1.5">
          <Label htmlFor="scooter-brand">Brand</Label>
          <Select
            value={brand}
            onValueChange={(v) => {
              setBrand(v);
              setModel("");
            }}
            disabled={isPending || brands.length === 0}
          >
            <SelectTrigger id="scooter-brand">
              <SelectValue placeholder={isPending ? "Loading…" : "Select brand"} />
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

        <div className="grid min-w-40 flex-1 gap-1.5">
          <Label htmlFor="scooter-model">Model</Label>
          <Select value={model} onValueChange={setModel} disabled={!brand}>
            <SelectTrigger id="scooter-model">
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

        <Button
          disabled={!model}
          onClick={() => {
            setVehicle({ brand, model });
            void navigate({ to: "/shop", search: { model } });
          }}
        >
          Show parts that fit
        </Button>
      </div>

      {vehicle && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="size-4 text-primary" /> Saved vehicle: {vehicle.brand} {vehicle.model}
          <Button variant="ghost" size="sm" onClick={() => setVehicle(null)}>
            Clear
          </Button>
        </p>
      )}
    </div>
  );
}
