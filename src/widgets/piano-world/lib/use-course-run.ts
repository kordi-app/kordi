"use client";

import { useCallback, useRef, useState } from "react";
import type { CourseDef, CourseId } from "../model/course";
import type { CourseRecordMessage } from "./use-world-presence";
import { readCourseBest, writeCourseBest, type CourseRun } from "../model/course-record";
import type { HatId } from "@/entities/character";

/** Guests keep course rewards in this browser: the hat each course unlocks. */
const REWARD_OF: Record<CourseId, HatId> = { clouds: "crown", night: "star-crown" };
const readLocalRewards = (): HatId[] =>
  (Object.keys(REWARD_OF) as CourseId[]).filter((c) => readCourseBest(c) !== null).map((c) => REWARD_OF[c]);

const freshRun = (course: CourseId, signedIn: boolean): CourseRun => ({
  course,
  startedAt: null,
  reached: 0,
  finishedMs: null,
  // members' bests live on the server (it times their runs); guests' in this browser
  best: signedIn ? null : readCourseBest(course),
  server: null,
});

/**
 * Timing and reward for the jump courses. A run starts on the first step,
 * resets if you fall back to the floor, and finishing records that course's
 * best time. Topping the clouds earns the crown; the night, the star crown.
 *
 * Guests: bests and rewards are kept in localStorage. Members: nothing is
 * stored here — the server times the run and grants (and puts on) the reward.
 */
export function useCourseRun(onFinish: () => void, initialCourse: CourseId = "clouds", signedIn = false) {
  /** rewards a guest has earned in this browser (always empty for members) */
  const [localRewards, setLocalRewards] = useState<HatId[]>(() => (signedIn ? [] : readLocalRewards()));
  const [run, setRun] = useState<CourseRun>(() => freshRun(initialCourse, signedIn));
  const runRef = useRef(run);

  const commit = useCallback((next: CourseRun) => {
    runRef.current = next;
    setRun(next);
  }, []);

  /** Entering a course region: show that course's card from scratch. */
  const enter = useCallback((course: CourseDef) => commit(freshRun(course.id, signedIn)), [commit, signedIn]);

  /** The platform under you changed (null = the floor). */
  const handlePlatform = useCallback(
    (course: CourseDef, index: number | null) => {
      const current = runRef.current.course === course.id ? runRef.current : freshRun(course.id, signedIn);
      let next = current;
      if (index === null) {
        if (current.startedAt !== null) next = { ...current, startedAt: null, reached: 0 };
      } else if (index === course.goalIndex) {
        if (current.startedAt !== null) {
          const finishedMs = performance.now() - current.startedAt;
          const best = current.best === null ? finishedMs : Math.min(current.best, finishedMs);
          if (!signedIn) {
            writeCourseBest(course.id, best);
            setLocalRewards(readLocalRewards());
          }
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
    [onFinish, commit, signedIn],
  );

  /** The server's timing arrived (a moment after the finish): show the rank it earned. */
  const applyServerRecord = useCallback(
    (record: CourseRecordMessage) => {
      const current = runRef.current;
      if (record.course !== current.course) return;
      commit({
        ...current,
        best: record.best ?? current.best,
        server: { ms: record.ms, rank: record.rank, saved: record.saved },
      });
    },
    [commit],
  );

  return { run, localRewards, enter, handlePlatform, applyServerRecord };
}
