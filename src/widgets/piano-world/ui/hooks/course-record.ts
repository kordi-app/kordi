import { readStored, writeStored } from "@/shared/lib/storage";
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

const bestKey = (course: CourseId) => `world.course-best.${course}`;

/** A guest's best time on a course (kept in this browser), or null. */
export function readCourseBest(course: CourseId): number | null {
  const value = readStored<unknown>(bestKey(course), null);
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function writeCourseBest(course: CourseId, ms: number) {
  writeStored(bestKey(course), Math.round(ms));
}

export function formatTime(ms: number) {
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = (total % 60).toFixed(1).padStart(4, "0");
  return `${minutes}:${seconds}`;
}
