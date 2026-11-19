/** State of the current climb on the hidden course. */
export interface CourseRun {
  /** performance.now() when the climb began; null when not climbing */
  startedAt: number | null;
  /** highest platform index reached this attempt */
  reached: number;
  /** time of the run that just finished */
  finishedMs: number | null;
  best: number | null;
}

const COURSE_BEST_KEY = "kordi.world.course-best.v1";

/** Best time lives only in this browser; storage can be unavailable, so never throw. */
export function readCourseBest(): number | null {
  try {
    const raw = window.localStorage.getItem(COURSE_BEST_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeCourseBest(ms: number) {
  try {
    window.localStorage.setItem(COURSE_BEST_KEY, String(Math.round(ms)));
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
