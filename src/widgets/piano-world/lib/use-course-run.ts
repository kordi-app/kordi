"use client";

import { useCallback, useRef, useState } from "react";
import type { CourseDef, CourseId } from "../model/course";
import type { CourseRecordMessage } from "./use-world-presence";
import { readCourseBest, writeCourseBest, type CourseRun } from "../model/course-record";
import type { CrownKind } from "../ui/crown-mesh";

const freshRun = (course: CourseId): CourseRun => ({
  course,
  startedAt: null,
  reached: 0,
  finishedMs: null,
  best: readCourseBest(course),
  server: null,
});

/**
 * Timing and reward for the jump courses. A run starts on the first step,
 * resets if you fall back to the floor, and finishing records that course's
 * best time. Topping the clouds earns the gold crown; the night, the star crown.
 */
export function useCourseRun(onFinish: () => void, initialCourse: CourseId = "clouds") {
  const [crown, setCrown] = useState<CrownKind>(() =>
    readCourseBest("night") !== null ? "star" : readCourseBest("clouds") !== null ? "gold" : null,
  );
  const [run, setRun] = useState<CourseRun>(() => freshRun(initialCourse));
  const runRef = useRef(run);

  const commit = useCallback((next: CourseRun) => {
    runRef.current = next;
    setRun(next);
  }, []);

  /** Entering a course region: show that course's card from scratch. */
  const enter = useCallback((course: CourseDef) => commit(freshRun(course.id)), [commit]);

  /** The platform under you changed (null = the floor). */
  const handlePlatform = useCallback(
    (course: CourseDef, index: number | null) => {
      const current = runRef.current.course === course.id ? runRef.current : freshRun(course.id);
      let next = current;
      if (index === null) {
        if (current.startedAt !== null) next = { ...current, startedAt: null, reached: 0 };
      } else if (index === course.goalIndex) {
        if (current.startedAt !== null) {
          const finishedMs = performance.now() - current.startedAt;
          const best = current.best === null ? finishedMs : Math.min(current.best, finishedMs);
          writeCourseBest(course.id, best);
          setCrown((was) => (course.id === "night" || was === "star" ? "star" : "gold"));
          onFinish();
          next = { ...current, startedAt: null, reached: course.goalIndex, finishedMs, best };
        }
      } else {
        next = {
          ...current,
          startedAt: current.startedAt ?? performance.now(),
          reached: Math.max(current.reached, index),
          finishedMs: current.startedAt === null ? null : current.finishedMs,
          server: current.startedAt === null ? null : current.server,
        };
      }
      if (next !== runRef.current) commit(next);
    },
    [onFinish, commit],
  );

  /** The server's timing arrived (a moment after the finish): show the rank it earned. */
  const applyServerRecord = useCallback(
    (record: CourseRecordMessage) => {
      const current = runRef.current;
      if (record.course !== current.course) return;
      commit({ ...current, server: { ms: record.ms, rank: record.rank, saved: record.saved } });
    },
    [commit],
  );

  return { run, crown, enter, handlePlatform, applyServerRecord };
}
