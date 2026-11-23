import { useSyncExternalStore } from "react";

/**
 * A value outside React state. Writing it re-renders only the components that
 * read it with {@link useStoreValue}, not whoever owns the store — for values
 * that change many times a second (a countdown) while most of the page doesn't
 * care.
 */
export interface ValueStore<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useStoreValue<T>(store: ValueStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
