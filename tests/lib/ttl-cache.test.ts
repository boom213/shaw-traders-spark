import { describe, expect, it } from "vitest";
import { createTtlCache } from "@/lib/ttl-cache";

describe("homepage feed cache", () => {
  it("reuses the value for 30 seconds, then reloads", async () => {
    let clock = 0;
    let loads = 0;
    const cache = createTtlCache<number>(30_000, () => clock);
    const load = async () => ++loads;
    expect(await cache.get(load)).toBe(1);
    clock = 29_999;
    expect(await cache.get(load)).toBe(1);
    clock = 30_000;
    expect(await cache.get(load)).toBe(2);
  });

  it("does not keep a result the caller rejects (empty feed)", async () => {
    let loads = 0;
    const cache = createTtlCache<number>(30_000, () => 0);
    const load = async () => ++loads;
    await cache.get(load, () => false);
    expect(await cache.get(load, () => false)).toBe(2);
  });

  it("does not keep a failed load", async () => {
    const cache = createTtlCache<number>(30_000, () => 0);
    await expect(cache.get(async () => { throw new Error("db down"); })).rejects.toThrow("db down");
    expect(await cache.get(async () => 7)).toBe(7);
  });

  it("shares one load between simultaneous visitors", async () => {
    let loads = 0;
    const cache = createTtlCache<number>(30_000, () => 0);
    const load = async () => { loads++; await new Promise((r) => setTimeout(r, 5)); return loads; };
    await Promise.all([cache.get(load), cache.get(load), cache.get(load)]);
    expect(loads).toBe(1);
  });
});
