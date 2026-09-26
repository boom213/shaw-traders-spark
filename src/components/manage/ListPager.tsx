import { Button } from "@/components/ui/button";

export const MANAGE_PAGE_SIZE = 8;

export function ListPager({ page, total, busy = false, onPage }: { page: number; total: number; busy?: boolean; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / MANAGE_PAGE_SIZE));
  if (total <= MANAGE_PAGE_SIZE) return null;
  const first = Math.max(0, Math.min(page - 2, pages - 5));
  const visible = Array.from({ length: Math.min(5, pages) }, (_, index) => first + index);
  return <nav aria-label="List pages" className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
    <span>{page * MANAGE_PAGE_SIZE + 1}–{Math.min(total, (page + 1) * MANAGE_PAGE_SIZE)} of {total}</span>
    <div className="flex items-center gap-1">
      <Button type="button" size="sm" variant="outline" disabled={page === 0 || busy} onClick={() => onPage(page - 1)}>Previous</Button>
      {visible.map((value) => <Button key={value} type="button" size="icon" variant={value === page ? "default" : "ghost"} className="size-8" disabled={busy} onClick={() => onPage(value)} aria-label={`Page ${value + 1}`}>{value + 1}</Button>)}
      <Button type="button" size="sm" variant="outline" disabled={page + 1 >= pages || busy} onClick={() => onPage(page + 1)}>Next</Button>
    </div>
  </nav>;
}