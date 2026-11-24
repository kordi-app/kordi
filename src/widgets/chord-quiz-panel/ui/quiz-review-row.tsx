"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import * as Tone from "tone";
import { ChevronDown, Volume2 } from "lucide-react";
import type { QuizAnswerResult } from "@/entities/chord-quiz";
import { bassLabel, getChordHint, toDisplayChordName } from "@/shared/lib/music";
import { playNoteAt } from "@/shared/lib/audio";
import { MiniKeyboard } from "@/shared/ui/mini-keyboard";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

interface QuizReviewRowProps {
  index: number;
  /** the question's stored chord name (sharp-based, e.g. "A#m7") */
  chordName: string;
  label: QuizAnswerResult;
  score: number;
  judged: boolean;
  /** the notes held when the answer was judged ([] on a timeout) */
  playedNotes: readonly number[];
  expanded: boolean;
  onToggle: () => void;
  /** don't make a sound (the keyboard's mute is on) */
  muted?: boolean;
}

const CHORD_SECONDS = 1.2;
const GAP_SECONDS = 0.4;

/** The right chord, then (if any) what was played, through the current instrument. */
function playComparison(target: readonly number[], played: readonly number[]) {
  const at = Tone.now() + 0.05;
  target.forEach((midi) => playNoteAt(midi, 0.7, at, CHORD_SECONDS));
  played.forEach((midi) => playNoteAt(midi, 0.7, at + CHORD_SECONDS + GAP_SECONDS, CHORD_SECONDS));
}

/** Pitch-class names of played notes, low to high, without repeats. */
function noteNames(midi: readonly number[]): string[] {
  return [...new Set(midi.toSorted((a, b) => a - b).map((m) => bassLabel(m % 12)))];
}

/**
 * One question in the result list. A missed one opens to compare the chord's
 * tones with the notes that were played, on a small keyboard, and plays both.
 * (No hints during the quiz itself — only here, after it's scored.)
 */
export function QuizReviewRow({
  index,
  chordName,
  label,
  score,
  judged,
  playedNotes,
  expanded,
  onToggle,
  muted = false,
}: QuizReviewRowProps) {
  const t = useTranslations("chordQuiz");
  const displayName = toDisplayChordName(chordName);
  const missed = label !== "correct";
  const hint = useMemo(() => (missed ? getChordHint(displayName) : null), [missed, displayName]);

  // a range that holds both chords, whole octaves, at least two
  const range = useMemo(() => {
    const all = [...(hint?.midi ?? []), ...playedNotes];
    if (all.length === 0) return { start: 48, end: 72 };
    const start = Math.floor(Math.min(...all) / 12) * 12;
    const end = Math.max(start + 24, Math.ceil((Math.max(...all) + 1) / 12) * 12);
    return { start, end };
  }, [hint, playedNotes]);

  const summary = (
    <>
      <div className="flex items-center gap-3">
        <span className="text-xs tabular-nums opacity-60">{index + 1}</span>
        <span className="font-semibold text-foreground">{displayName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-t1 font-semibold uppercase tracking-widest opacity-70">{t(label)}</span>
        <span className={cn("font-heading font-semibold tabular-nums text-foreground", !judged && "opacity-60")}>
          {score}
        </span>
        {hint ? (
          <ChevronDown aria-hidden className={cn("size-4 opacity-60 transition-transform", expanded && "rotate-180")} />
        ) : null}
      </div>
    </>
  );

  if (!hint) {
    return (
      <div className="flex items-center justify-between border-b border-border px-4 py-2 last:border-b-0">
        {summary}
      </div>
    );
  }

  const toggle = () => {
    if (!expanded && !muted) playComparison(hint.midi, playedNotes);
    onToggle();
  };

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={toggle}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left transition-colors hover:bg-muted"
      >
        {summary}
      </button>
      {expanded ? (
        <div className="space-y-3 px-4 pt-1 pb-4">
          <MiniKeyboard startMidi={range.start} endMidi={range.end} target={hint.midi} played={playedNotes} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="flex items-center gap-1.5 opacity-70">
              <span aria-hidden className="size-2.5 rounded-full bg-[oklch(0.75_0.12_75)]" />
              {t("answerNotes")}
            </dt>
            <dd className="font-semibold">{hint.labels.join(" · ")}</dd>
            <dt className="flex items-center gap-1.5 opacity-70">
              <span aria-hidden className="size-2.5 rounded-full bg-[oklch(0.65_0.15_25)]" />
              {t("yourNotes")}
            </dt>
            <dd className="font-semibold">
              {playedNotes.length > 0 ? noteNames(playedNotes).join(" · ") : t("noNotes")}
            </dd>
          </dl>
          {!muted ? (
            <Button size="sm" variant="outline" onClick={() => playComparison(hint.midi, playedNotes)}>
              <Volume2 aria-hidden className="size-4" />
              {t("listen")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
