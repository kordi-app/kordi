"use client";

import { useCallback, useRef, useState } from "react";
import { GOAL_INDEX } from "../model/course";
import { readCourseBest, writeCourseBest, type CourseRun } from "../model/course-record";

/**
 * Timing and reward for the hidden jump course. A run starts on the first
 * step, resets if you fall back to the cloud floor, and finishing records
 * the best time and earns the crown.
 */
export function useCourseRun(onFinish: () => void) {
  const [crowned, setCrowned] = useState(() => readCourseBest() !== null);
  const [run, setRun] = useState<CourseRun>(() => ({
    startedAt: null,
    reached: 0,
    finishedMs: null,
    best: readCourseBest(),
  }));
  const runRef = useRef(run);

  /** The platform under you changed (null = the cloud floor). */
  const handlePlatform = useCallback(
    (index: number | null) => {
      const current = runRef.current;
      let next = current;
      if (index === null) {
        if (current.startedAt !== null) next = { ...current, startedAt: null, reached: 0 };
      } else if (index === GOAL_INDEX) {
        if (current.startedAt !== null) {
          const finishedMs = performance.now() - current.startedAt;
          const best = current.best === null ? finishedMs : Math.min(current.best, finishedMs);
          writeCourseBest(best);
          setCrowned(true);
          onFinish();
          next = { startedAt: null, reached: GOAL_INDEX, finishedMs, best };
        }
      } else {
        next = {
          ...current,
          startedAt: current.startedAt ?? performance.now(),
          reached: Math.max(current.reached, index),
          finishedMs: current.startedAt === null ? null : current.finishedMs,
        };
      }
      if (next !== current) {
        runRef.current = next;
        setRun(next);
      }
    },
    [onFinish],
  );

  return { run, crowned, handlePlatform };
}
