import type { CourseId } from "../../engine/course";

/** State of the current climb on a jump course. */
export interface CourseRun {
  course: CourseId;
  /** performance.now() when the climb began; null when not climbing */
  startedAt: number | null;
  /** highest platform index reached this attempt */
  reached: number;
  /** time of the run that just finished */
  finishedMs: number | null;
  best: number | null;
  /** the server's timing of the run that just finished (rank, whether it ranked) */
  server: { ms: number; rank: number; saved: boolean } | null;
}

// the cloud course keeps its original key so earlier records carry over
const BEST_KEYS: Record<CourseId, string> = {
  clouds: "kordi.world.course-best.v1",
  night: "kordi.world.course-best.night.v1",
  ruins: "kordi.world.course-best.ruins.v1",
};

/** Best times live only in this browser; storage can be unavailable, so never throw. */
export function readCourseBest(course: CourseId): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_KEYS[course]);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeCourseBest(course: CourseId, ms: number) {
  try {
    window.localStorage.setItem(BEST_KEYS[course], String(Math.round(ms)));
  } catch {
    // private mode etc. — the crown just won't persist
  }
}

export function formatTime(ms: number) {
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = (total % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}
