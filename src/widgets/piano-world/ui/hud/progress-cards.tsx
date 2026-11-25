"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronsUp } from "lucide-react";
import { rankingQueries } from "@/entities/ranking";
import { midiToNoteName } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";
import { COURSES } from "../../engine/course";
import { formatTime, type CourseRun } from "../hooks/course-record";
import type { PianoWorldCopy } from "../copy";
import type { Melody } from "../../engine/melodies";
import type { MelodyProgress } from "../hooks/use-melody-game";
import { HUD_CARD } from "./surface";

/** Fill "{jump}" with the jump control: the Space key, or on touch screens the jump button's icon. */
function withJumpKey(template: string): ReactNode {
  const [before, after] = template.split("{jump}");
  if (after === undefined) return template;
  return (
    <>
      {before}
      <span className="pointer-coarse:hidden">Space</span>
      <ChevronsUp aria-label="jump" className="hidden size-3.5 align-[-0.2em] pointer-coarse:inline" />
      {after}
    </>
  );
}

/**
 * Shared shape: title + value on top, a progress bar, a hint line. Centered at
 * the top on wide screens; on narrower ones it drops below the corner chips
 * (place name, note, my name) so it never covers them.
 */
function ProgressCard({
  title,
  value,
  ratio,
  barClass,
  hint,
  footer,
}: {
  title: ReactNode;
  value: ReactNode;
  ratio: number;
  barClass: string;
  hint: ReactNode;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const percent = Math.min(Math.max(ratio, 0), 1) * 100;
  return (
    <div
      className={cn(
        HUD_CARD,
        "pointer-events-none absolute left-4 top-[7.5rem] w-[min(20rem,calc(100%-2rem))] px-4 pb-3 pt-3.5 md:left-6 md:top-32 lg:left-1/2 lg:top-6 lg:-translate-x-1/2",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p id={titleId} className="truncate text-sm font-semibold -tracking-[0.01em] text-foreground">
          {title}
        </p>
        <div className="shrink-0">{value}</div>
      </div>
      {/* the track is ink on cream, not a second cream: an empty bar still has to read as a bar */}
      <div
        role="progressbar"
        aria-labelledby={titleId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
            barClass,
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      {footer}
    </div>
  );
}

/** The small count at a card's top right ("3 / 14") */
const COUNT = "text-xs font-medium tabular-nums text-muted-foreground";

export function MelodyCard({
  melody,
  progress,
  copy,
}: {
  melody: Melody;
  progress: MelodyProgress;
  copy: PianoWorldCopy;
}) {
  const total = melody.notes.length;
  const next = progress.done ? null : melody.notes[progress.step];
  return (
    <ProgressCard
      title={copy.melodies[melody.key]}
      value={<span className={COUNT}>{progress.done ? copy.melodyDone : `${progress.step} / ${total}`}</span>}
      ratio={progress.step / total}
      barClass="bg-warning"
      hint={
        next !== null
          ? withJumpKey(`${copy.melodyNext} ${midiToNoteName(next)} · ${copy.melodyHint}`)
          : copy.melodyNextSong
      }
    />
  );
}

/** Fill a "{rank}" template. */
const withRank = (template: string, rank: number) => template.replace("{rank}", String(rank));

/** All-time top three, and where the run you just finished landed. */
function CourseRanking({ run, isGuest, copy }: { run: CourseRun; isGuest: boolean; copy: PianoWorldCopy }) {
  const { data: top } = useQuery(rankingQueries.course(run.course));
  const server = run.startedAt === null ? run.server : null;
  const result = server
    ? server.saved
      ? withRank(copy.courseRankSaved, server.rank)
      : isGuest
        ? withRank(copy.courseRankGuest, server.rank)
        : withRank(copy.courseRankMember, server.rank)
    : null;
  return (
    <div className="mt-2.5 border-t border-border pt-2.5">
      {result ? <p className="mb-2 text-xs font-semibold text-foreground">{result}</p> : null}
      <p className="text-t1 font-semibold tracking-[0.05em] text-muted-foreground">{copy.courseRankingTitle}</p>
      {top && top.length > 0 ? (
        <ol className="mt-1.5 space-y-1">
          {top.slice(0, 3).map((entry) => (
            <li key={entry.rank} className="flex items-baseline gap-2 text-xs text-foreground">
              {/* the system's ranking colour, for whoever holds the record */}
              <span
                className={cn(
                  "w-3 text-center font-semibold tabular-nums",
                  entry.rank === 1 ? "text-warning" : "text-muted-foreground",
                )}
              >
                {entry.rank}
              </span>
              <span className="min-w-0 flex-1 truncate">{entry.nickname}</span>
              <span className="tabular-nums text-muted-foreground">{formatTime(entry.timeMs)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{copy.courseRankingEmpty}</p>
      )}
    </div>
  );
}

export function CourseCard({ run, isGuest, copy }: { run: CourseRun; isGuest: boolean; copy: PianoWorldCopy }) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (run.startedAt === null) return;
    const timer = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(timer);
  }, [run.startedAt]);

  // `now` only ticks during a run: right after a start it can still predate it
  const elapsed = run.startedAt !== null ? Math.max(0, now - run.startedAt) : (run.finishedMs ?? 0);
  const justFinished = run.finishedMs !== null && run.startedAt === null;
  // each course's own heading, hint and bar colour (the cloud course is the plain one).
  // The 500 steps: a 300 is too pale to tell from the track on cream.
  const look = {
    clouds: { title: copy.courseTitle, hint: withJumpKey(copy.courseHint), bar: "bg-palette-purple-500" },
    night: { title: copy.nightTitle, hint: copy.nightHint, bar: "bg-palette-yellow-500" },
    ruins: { title: copy.ruinsTitle, hint: copy.ruinsHint, bar: "bg-palette-red-500" },
  }[run.course];

  return (
    <ProgressCard
      title={justFinished ? (run.course === "night" ? copy.nightDone : copy.courseDone) : look.title}
      value={
        <span className="text-lg font-semibold -tracking-[0.02em] tabular-nums text-foreground">
          {formatTime(elapsed)}
        </span>
      }
      ratio={run.reached / COURSES[run.course].goalIndex}
      barClass={look.bar}
      hint={run.best !== null ? `${copy.courseBest} ${formatTime(run.best)}` : look.hint}
      footer={<CourseRanking run={run} isGuest={isGuest} copy={copy} />}
    />
  );
}

/** The dream sea: the whale's notes you've found so far. */
export function DreamCard({ found, total, sung, copy }: { found: number; total: number; sung: boolean; copy: PianoWorldCopy }) {
  return (
    <ProgressCard
      title={copy.dreamTitle}
      value={
        <span className={COUNT}>
          {found} / {total}
        </span>
      }
      ratio={found / total}
      barClass="bg-palette-purple-500"
      hint={sung ? copy.whaleSings : found >= total ? copy.dreamReady : copy.dreamHint}
    />
  );
}
