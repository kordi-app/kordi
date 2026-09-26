import { useEffect, useRef } from "react";

/**
 * Keeps a ref in sync with the latest callback.
 *
 * Prefer `useEffectEvent`: it is React's own answer to this pattern and needs no
 * ref. Reach for this hook only when the callback fires outside an Effect — from
 * a `useCallback` a user triggers, say — which `useEffectEvent` forbids.
 *
 * The write happens in an Effect rather than during render, so the ref trails the
 * latest callback until React commits. That is safe for the user-triggered case
 * above and unsafe if you need the fresh value during the same render.
 */
export function useCallbackRef<T>(callback: T): React.RefObject<T> {
  const ref = useRef(callback);
  useEffect(() => {
    ref.current = callback;
  });
  return ref;
}
