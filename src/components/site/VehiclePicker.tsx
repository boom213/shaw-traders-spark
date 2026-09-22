import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bike, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVehicle } from "@/hooks/useVehicle";
import { vehicleTreeQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Brand then model, remembered on this device, so every listing can show
 * "fits your scooter" without asking again.
 */
export function VehiclePicker({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { vehicle, setVehicle } = useVehicle();
  const [open, setOpen] = useState(false);
  const { data: tree, isPending } = useQuery({ ...vehicleTreeQuery(), enabled: open });
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (open && vehicle) {
      setBrand(vehicle.brand);
      setModel(vehicle.model);
    }
  }, [open, vehicle]);

  const brands = (tree ?? []).map((b) => b.brand);
  const models = (tree ?? []).find((b) => b.brand === brand)?.models ?? [];

  const save = () => {
    if (!model) return;
    setVehicle({ brand: brand || model.split(/\s+/)[0] || model, model });
    setOpen(false);
    void navigate({ to: "/shop", search: { model } });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold hover:bg-muted",
          className,
        )}
        aria-label="Choose your scooter"
      >
        <Bike className="size-4 text-primary" />
        <span className="max-w-32 truncate">{vehicle ? vehicle.model : "Your scooter"}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Which scooter do you have?</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Brand</Label>
              <Select
                value={brand}
                onValueChange={(v) => {
                  setBrand(v);
                  setModel("");
                }}
                disabled={isPending || brands.length === 0}
              >
                <SelectTrigger><SelectValue placeholder={isPending ? "Loading…" : "Select brand"} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel} disabled={!brand}>
                <SelectTrigger><SelectValue placeholder={brand ? "Select model" : "Pick a brand first"} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={!model}>Show parts that fit</Button>
            {vehicle && (
              <Button
                variant="ghost"
                onClick={() => {
                  setVehicle(null);
                  setBrand("");
                  setModel("");
                  setOpen(false);
                }}
              >
                Forget my scooter
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
