import { randomUUID } from "node:crypto";

// Short-lived, process-local snapshots: deleted data is never retained in the database.
// Refuse new snapshots at capacity rather than invalidating an Undo already offered.
export function createUndoStore<T>({
  ttlMs = 5 * 60_000,
  maxBytes = 32 * 1024 * 1024,
  maxEntries = 128,
  now = Date.now,
} = {}) {
  const entries = new Map<
    string,
    {
      scope: string;
      value: T;
      bytes: number;
      expiresAt: number;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  let usedBytes = 0;
  function discard(token: string) {
    const entry = entries.get(token);
    if (!entry) return;
    clearTimeout(entry.timer);
    usedBytes -= entry.bytes;
    entries.delete(token);
  }
  function purgeExpired() {
    for (const [token, entry] of entries) if (entry.expiresAt <= now()) discard(token);
  }
  return {
    remember(scope: string, value: T, bytes: number): string | null {
      purgeExpired();
      if (
        bytes < 0 ||
        !Number.isFinite(bytes) ||
        usedBytes + bytes > maxBytes ||
        entries.size >= maxEntries
      )
        return null;
      const token = randomUUID();
      const timer = setTimeout(() => discard(token), ttlMs);
      timer.unref();
      entries.set(token, { scope, value, bytes, expiresAt: now() + ttlMs, timer });
      usedBytes += bytes;
      return token;
    },
    get(scope: string, token: string): T | undefined {
      purgeExpired();
      const entry = entries.get(token);
      return entry?.scope === scope ? entry.value : undefined;
    },
    discard,
  };
}
