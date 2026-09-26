"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCallbackRef } from "@/shared/lib/react/use-callback-ref";

interface UseQuizTimerOptions {
  duration: number;
  enabled: boolean;
  resetKey?: number;
  onTick: (remaining: number) => void;
  onTimeout: () => void;
}

export function useQuizTimer({
  duration,
  enabled,
  resetKey = 0,
  onTick,
  onTimeout,
}: UseQuizTimerOptions) {
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  // rAF callbacks fire from restart(), which callers invoke from event handlers,
  // so useEffectEvent is not allowed here.
  const onTickRef = useCallbackRef(onTick);
  const onTimeoutRef = useCallbackRef(onTimeout);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  const startLoop = useCallback(() => {
    stop();

    const loop = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const remaining = Math.max(0, duration - elapsed);

      onTickRef.current(remaining);

      if (remaining <= 0) {
        onTimeoutRef.current();
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [duration, stop, onTickRef, onTimeoutRef]);

  const restart = useCallback(() => {
    startTimeRef.current = performance.now();
    pausedAtRef.current = 0;
    startLoop();
  }, [startLoop]);

  useEffect(() => {
    if (enabled) {
      restart();
    } else {
      stop();
    }
    return stop;
  }, [enabled, resetKey, restart, stop]);

  // rAF freezes in background tabs, which would otherwise stall the clock and
  // then fire an instant timeout on return. Pause while hidden and shift the
  // start time by the hidden duration so the countdown resumes where it left off.
  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) {
        pausedAtRef.current = performance.now();
        stop();
      } else if (pausedAtRef.current > 0) {
        startTimeRef.current += performance.now() - pausedAtRef.current;
        pausedAtRef.current = 0;
        startLoop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [enabled, startLoop, stop]);

  return { restart, stop };
}
