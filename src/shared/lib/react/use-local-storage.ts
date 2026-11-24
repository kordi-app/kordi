"use client";

import { useState, useCallback } from "react";
import { readStored, writeStored } from "../storage";

/**
 * State kept in this browser (see ../storage for the namespace and the
 * never-throw rules). Read once on mount; every set writes through.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readStored(key, initialValue));

  const set = useCallback(
    (next: T) => {
      setValue(next);
      writeStored(key, next);
    },
    [key],
  );

  return [value, set] as const;
}
