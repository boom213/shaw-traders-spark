import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/hooks/useStore";
import { CATEGORIES } from "@/lib/catalog";

export function FindPartsWidget() {
  const { state } = useStore();
  const navigate = useNavigate();
  const [brand, setBrand] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const vehicles = state.vehicles;
  const models = vehicles.find((v) => v.brand === brand)?.models ?? [];

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-7">
      {vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Vehicle compatibility data is maintained by Shaw Traders in the admin panel. Once vehicle brands and models are added, you can
          pick your EV here and see matching parts. In the meantime, search the shop or message us on WhatsApp with your vehicle details.
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label>Vehicle Brand</Label>
          <Select value={brand} onValueChange={(v) => { setBrand(v); setModel(""); }} disabled={vehicles.length === 0}>
            <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => (
                <SelectItem key={v.brand} value={v.brand}>{v.brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Model</Label>
          <Select value={model} onValueChange={setModel} disabled={models.length === 0}>
            <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Part Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button
        className="mt-5"
        onClick={() =>
          navigate({
            to: "/shop",
            search: {
              q: [brand, model].filter(Boolean).join(" ") || undefined,
              category: category || undefined,
            },
          })
        }
      >
        Show matching parts
      </Button>
    </div>
  );
}
