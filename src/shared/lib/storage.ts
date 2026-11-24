/**
 * This browser's localStorage, under one versioned namespace. Bumping
 * NAMESPACE forgets every key at once (no stale shapes after a change).
 * Storage can be unavailable (private mode, blocked, full): reads fall back,
 * writes are dropped, and nothing throws.
 */
const NAMESPACE = "kordi:v1";

export const storageKey = (key: string) => `${NAMESPACE}:${key}`;

/** The stored value (JSON), or `fallback` if there's none or it can't be read. */
export function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // unavailable or full: kept for this visit only
  }
}
