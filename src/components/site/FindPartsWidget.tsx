import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoriesQuery, facetsQuery } from "@/lib/queries";

export function FindPartsWidget() {
  const navigate = useNavigate();
  const { data: facets, isPending } = useQuery(facetsQuery());
  const { data: categories } = useQuery(categoriesQuery());
  const [model, setModel] = useState("");
  const [category, setCategory] = useState("");

  const models = facets?.models ?? [];

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-7">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5 sm:col-span-2">
          <Label>Your EV model</Label>
          <Select value={model} onValueChange={setModel} disabled={isPending || models.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={isPending ? "Loading models…" : "Select your model"} />
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
      <Button
        className="mt-5"
        onClick={() =>
          navigate({
            to: "/shop",
            search: { model: model || undefined, category: category || undefined },
          })
        }
      >
        Show matching parts
      </Button>
      {!isPending && models.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Model compatibility is still being added. Message us on WhatsApp with your vehicle details and we will confirm the fit.
        </p>
      )}
    </div>
  );
}
