import { ChevronDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export function MultiSelectDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <div className="space-y-2">
      <Popover>
        <PopoverTrigger className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-sm">
          <span className={value.length ? "" : "text-muted-foreground"}>
            {value.length ? `${label} (${value.length} picked)` : label}
          </span>
          <ChevronDown className="size-4 opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-72 w-[--radix-popover-trigger-width] overflow-y-auto p-1">
          {options.map((o) => (
            <label key={o} className="flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-muted">
              <Checkbox checked={value.includes(o)} onCheckedChange={() => toggle(o)} />
              {o}
            </label>
          ))}
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-0.5 pl-2.5 pr-1 text-xs">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => toggle(v)} className="grid size-5 place-items-center rounded-full hover:bg-muted">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
