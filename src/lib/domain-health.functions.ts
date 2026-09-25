import { createServerFn } from "@tanstack/react-start";
const EXPECTED_A = "185.158.133.1";
const ROOT = "shawtradersev.com";
const WWW = `www.${ROOT}`;
const VERIFY_HOST = `_lovable.${ROOT}`;

export type RecordCheck = {
  name: string;
  type: "A" | "TXT";
  expected: string;
  observed: string[];
  state: "ok" | "missing" | "drifted" | "error";
};

export type HostReachability = {
  host: string;
  reachable: boolean;
  status: number | null;
  sslOk: boolean;
  error: string | null;
};

export type DomainHealth = {
  checkedAt: string;
  records: RecordCheck[];
  hosts: HostReachability[];
  nameservers: string[];
  published: boolean;
  summary: "healthy" | "attention" | "down";
};

async function doh(name: string, type: "A" | "TXT" | "NS"): Promise<string[]> {
  const res = await fetch(
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
    { headers: { accept: "application/dns-json" } },
  );
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const json = (await res.json()) as { Answer?: Array<{ type: number; data: string }> };
  return (json.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, "").trim());
}

async function checkRecord(
  name: string,
  type: "A" | "TXT",
  expectedPrefixOrValue: string,
): Promise<RecordCheck> {
  try {
    const observed = await doh(name, type);
    const match =
      type === "A"
        ? observed.includes(expectedPrefixOrValue)
        : observed.some((v) => v.startsWith(expectedPrefixOrValue));
    const state: RecordCheck["state"] = match ? "ok" : observed.length ? "drifted" : "missing";
    return { name, type, expected: expectedPrefixOrValue, observed, state };
  } catch (e) {
    return {
      name,
      type,
      expected: expectedPrefixOrValue,
      observed: [],
      state: "error",
    };
  }
}

async function checkHost(host: string): Promise<HostReachability> {
  try {
    const res = await fetch(`https://${host}/`, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": "shaw-domain-health" },
    });
    return { host, reachable: true, status: res.status, sslOk: true, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const sslOk = !/ssl|tls|certificate|handshake/i.test(msg);
    return { host, reachable: false, status: null, sslOk, error: msg };
  }
}

export const getDomainHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<DomainHealth> => {
    const { requireStaff } = await import("@/lib/staff.server");
    await requireStaff({ capability: "settings" });

    const [rootA, wwwA, verifyTxt, hostRoot, hostWww, ns] = await Promise.all([
      checkRecord(ROOT, "A", EXPECTED_A),
      checkRecord(WWW, "A", EXPECTED_A),
      checkRecord(VERIFY_HOST, "TXT", "lovable_verify="),
      checkHost(ROOT),
      checkHost(WWW),
      doh(ROOT, "NS").catch(() => [] as string[]),
    ]);

    const records = [rootA, wwwA, verifyTxt];
    const hosts = [hostRoot, hostWww];
    const published = hostRoot.reachable && (hostRoot.status ?? 500) < 500;

    const anyBroken = records.some((r) => r.state === "missing" || r.state === "drifted");
    const summary: DomainHealth["summary"] = !hostRoot.reachable
      ? "down"
      : anyBroken || !hostWww.reachable
        ? "attention"
        : "healthy";

    return {
      checkedAt: new Date().toISOString(),
      records,
      hosts,
      nameservers: ns.map((n) => n.replace(/\.$/, "")),
      published,
      summary,
    };
  },
);
