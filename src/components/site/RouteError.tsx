import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/error-reporting";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export function reportRouteError(error: unknown, boundary: string) {
  console.error(`[router:${boundary}]`, error);
  reportLovableError(error, { boundary });
  if (typeof window === "undefined") return;
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  reportError(`Router failure (${boundary}): ${message}`, stack);
}

export function RouteError({
  error,
  reset,
  boundary = "default_error_component",
}: {
  error: Error;
  reset?: () => void;
  boundary?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    reportRouteError(error, boundary);
  }, [boundary, error]);

  return (
    <div role="alert" className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn&apos;t load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try again or return to the shop.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              void router.invalidate();
              reset?.();
            }}
          >
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link to="/shop">Return to shop</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}