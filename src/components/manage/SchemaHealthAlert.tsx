import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { schemaHealth } from "@/lib/schema-health.functions";

export function SchemaHealthAlert() {
  const checkSchema = useServerFn(schemaHealth);
  const { data: missing } = useQuery({
    queryKey: ["schema-health"],
    queryFn: () => checkSchema(),
  });

  if (!missing?.length) return null;

  return (
    <Alert variant="destructive" className="bg-card">
      <AlertTriangle className="size-4" />
      <AlertTitle>
        Database update pending — {missing.length} item{missing.length === 1 ? "" : "s"} the app needs {missing.length === 1 ? "is" : "are"} missing from the database.
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {missing.map((object) => <li key={object}>{object}</li>)}
        </ul>
        <p className="mt-2">Some pages may fail until the pending migration is applied.</p>
      </AlertDescription>
    </Alert>
  );
}