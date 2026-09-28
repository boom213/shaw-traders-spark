import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function OrderTypeTabs({ showCounterSales }: { showCounterSales: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const onlineActive = pathname === "/manage/orders";
  const counterActive = pathname === "/manage/counter-sales";

  if (!showCounterSales) return null;

  return (
    <nav aria-label="Order type" className="grid w-full grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:w-fit">
      <Button asChild size="sm" variant={onlineActive ? "secondary" : "ghost"} className="min-w-0 shadow-none">
        <Link to="/manage/orders" aria-current={onlineActive ? "page" : undefined}>Online Orders</Link>
      </Button>
      <Button asChild size="sm" variant={counterActive ? "secondary" : "ghost"} className="min-w-0 shadow-none">
        <Link to="/manage/counter-sales" aria-current={counterActive ? "page" : undefined}>Counter Sales</Link>
      </Button>
    </nav>
  );
}