import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type OrderTypeTabsProps = {
  showCounterSales: boolean;
  onlineCount?: number;
  counterCount?: number;
};

function TabLabel({ label, count }: { label: string; count?: number }) {
  return (
    <span className="flex min-w-0 items-center justify-center gap-1.5">
      <span>{label}</span>
      {count !== undefined && <span className="text-xs font-normal text-muted-foreground">{count}</span>}
    </span>
  );
}

export function OrderTypeTabs({ showCounterSales, onlineCount, counterCount }: OrderTypeTabsProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onlineActive = pathname === "/manage/orders";
  const counterActive = pathname === "/manage/counter-sales";

  if (!showCounterSales) return null;

  return (
    <nav aria-label="Order type" className="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:w-fit">
      <Button asChild size="sm" variant={onlineActive ? "secondary" : "ghost"} className="min-w-0 shadow-none">
        <Link to="/manage/orders" aria-current={onlineActive ? "page" : undefined}>
          <TabLabel label="Online Orders · Retail" count={onlineCount} />
        </Link>
      </Button>
      <Button asChild size="sm" variant={counterActive ? "secondary" : "ghost"} className="min-w-0 shadow-none">
        <Link to="/manage/counter-sales" aria-current={counterActive ? "page" : undefined}>
          <TabLabel label="Counter Sales · Wholesale" count={counterCount} />
        </Link>
      </Button>
    </nav>
  );
}