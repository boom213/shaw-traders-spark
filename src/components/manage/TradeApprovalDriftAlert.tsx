import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { tradeApprovalDrift } from "@/lib/trade-integrity.functions";

export function TradeApprovalDriftAlert() {
  const { data: drift } = useQuery({ queryKey: ["trade-approval-drift"], queryFn: () => tradeApprovalDrift() });
  if (!drift?.length) return null;
  return <Alert variant="destructive" className="bg-card"><AlertTriangle className="size-4" /><AlertTitle>Wholesale approval needs attention</AlertTitle><AlertDescription><p>These approved businesses are not fully active and will not appear in Counter Sales:</p><ul className="mt-2 list-disc space-y-1 pl-5">{drift.map((item) => <li key={item.applicationId}>{item.businessName}</li>)}</ul></AlertDescription></Alert>;
}