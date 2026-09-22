import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Globe, Lock, ServerCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDomainHealth, type RecordCheck } from "@/lib/domain-health.functions";

export const Route = createFileRoute("/manage/domain")({
  head: () => ({
    meta: [
      { title: "Domain Health — Shaw Traders EV" },
      { name: "description", content: "SSL, DNS and publishing status for shawtradersev.com." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Domain Health — Shaw Traders EV" },
      { property: "og:description", content: "SSL, DNS and publishing status for shawtradersev.com." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DomainHealthPage,
});

function StateIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle2 className="size-4 text-emerald-600" />;
  if (warn) return <AlertTriangle className="size-4 text-amber-600" />;
  return <XCircle className="size-4 text-destructive" />;
}

function recordLabel(r: RecordCheck) {
  if (r.state === "ok") return "Correct";
  if (r.state === "missing") return "Missing";
  if (r.state === "drifted") return "Points elsewhere";
  return "Could not check";
}

function DomainHealthPage() {
  const fetchHealth = useServerFn(getDomainHealth);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["domain-health"],
    queryFn: () => fetchHealth(),
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Domain health</h2>
          <p className="text-sm text-muted-foreground">
            Live checks for shawtradersev.com
            {data ? ` · last checked ${new Date(data.checkedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Re-check
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            Could not run the checks right now. Try again in a moment.
          </CardContent>
        </Card>
      ) : null}

      {!data && isFetching ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="size-4" /> Secure connection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.hosts.map((h) => (
                  <div key={h.host} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{h.host}</span>
                    <span className="flex items-center gap-1.5">
                      <StateIcon ok={h.reachable && h.sslOk} warn={h.reachable} />
                      {h.reachable ? "Valid" : h.sslOk ? "Unreachable" : "Certificate issue"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ServerCog className="size-4" /> Address records
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.records.map((r) => (
                  <div key={`${r.type}-${r.name}`} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{r.type === "TXT" ? "Ownership proof" : r.name}</span>
                    <span className="flex items-center gap-1.5">
                      <StateIcon ok={r.state === "ok"} warn={r.state === "error"} />
                      {recordLabel(r)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="size-4" /> Site availability
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span>Live to visitors</span>
                  <span className="flex items-center gap-1.5">
                    <StateIcon ok={data.published} />
                    {data.published ? "Yes" : "No"}
                  </span>
                </div>
                <Badge
                  variant={data.summary === "healthy" ? "default" : "secondary"}
                  className="mt-1"
                >
                  {data.summary === "healthy"
                    ? "All good"
                    : data.summary === "attention"
                      ? "Needs attention"
                      : "Site is down"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium">Where the domain points</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {data.records.map((r) => (
                    <li key={`d-${r.type}-${r.name}`}>
                      {r.name} ({r.type}): {r.observed.length ? r.observed.join(", ") : "nothing found"}
                      {r.state === "ok" ? "" : ` — expected ${r.expected}`}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium">Domain provider</p>
                <p className="mt-1 text-muted-foreground">
                  {data.nameservers.length ? data.nameservers.join(", ") : "Not available"}
                </p>
              </div>
              {data.hosts.some((h) => !h.reachable) ? (
                <p className="text-muted-foreground">
                  If an address is unreachable, make sure the site has been published and that both
                  the plain and www versions of the domain are connected.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
