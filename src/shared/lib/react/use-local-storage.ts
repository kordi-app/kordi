"use client";

import { useState, useCallback } from "react";

const STORAGE_NAMESPACE = "kordi:v1";

function namespacedKey(key: string) {
  return `${STORAGE_NAMESPACE}:${key}`;
}

/**
 * Persist state to localStorage with a versioned namespace.
 * Bumping `STORAGE_NAMESPACE` invalidates all prior keys in one sweep
 * (avoids stale schema bugs when shipping new state shapes).
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(namespacedKey(key));
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(namespacedKey(key), JSON.stringify(next));
      } catch {
        /* ignore — storage full or unavailable */
      }
    },
    [key],
  );

  return [value, set] as const;
}
