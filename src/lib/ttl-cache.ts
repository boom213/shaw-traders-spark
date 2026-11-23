/**
 * Tiny in-memory cache for one public, read-only value. Lives inside a single
 * server instance, so it only saves database trips for repeat visitors; it is
 * never shared with staff screens. Concurrent callers share one load, failed
 * loads are not kept, and `keep` can refuse to store a suspicious result.
 */
export function createTtlCache<T>(ttlMs: number, now: () => number = Date.now) {
  let value: { data: T; expires: number } | null = null;
  let pending: Promise<T> | null = null;
  return {
    get(load: () => Promise<T>, keep: (data: T) => boolean = () => true): Promise<T> {
      if (value && value.expires > now()) return Promise.resolve(value.data);
      if (pending) return pending;
      pending = load()
        .then((data) => {
          value = keep(data) ? { data, expires: now() + ttlMs } : null;
          return data;
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    clear() {
      value = null;
    },
  };
}
