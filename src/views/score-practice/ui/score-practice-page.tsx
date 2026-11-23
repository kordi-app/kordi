"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Pause, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { ScoreEntry, ScoreTimeline } from "@/entities/score";
import { usePianoInput } from "@/features/piano-player";
import { loadScoreSource, useScoreLibrary } from "@/features/score-library";
import { useScorePractice, type Hands, type PracticeMode } from "@/features/score-practice";
import { MidiStatus, PianoKeyboard } from "@/widgets/piano-keyboard";
import { ScoreSheet } from "@/widgets/score-sheet";
import { Button } from "@/shared/ui/button";
import { MonoPill } from "@/shared/ui/mono-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const MODES: PracticeMode[] = ["listen", "wait", "tempo"];
const HANDS: Hands[] = ["right", "left", "both"];
const SPEEDS = [0.5, 0.75, 1];
/** five octaves, C2–C7: room for both hands of most piano music */
const KEYBOARD_START = 36;
const KEYBOARD_END = 96;

/**
 * Practise a piece from its score: pick (or add) a MusicXML score, choose the
 * hand(s) you play, and the app plays the rest while the cursor follows.
 */
export function ScorePracticePage() {
  const t = useTranslations("scorePractice");
  const { activeNotes, isAudioStarted, isLoaded, startAudio, keyboard, midi, mouse } = usePianoInput();
  const library = useScoreLibrary();
  const [selected, setSelected] = useState<ScoreEntry>(library.scores[0]);
  const [source, setSource] = useState<string | Blob | null>(null);
  const [timeline, setTimeline] = useState<ScoreTimeline | null>(null);
  const [problem, setProblem] = useState<"load" | "file" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const practice = useScorePractice(timeline, activeNotes);
  const { view } = practice;

  useEffect(() => {
    let cancelled = false;
    loadScoreSource(selected)
      .then((data) => {
        if (cancelled) return;
        setTimeline(null);
        setSource(data);
        setProblem(data ? null : "load");
      })
      .catch(() => {
        if (!cancelled) setProblem("load");
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const onLoad = useCallback((next: ScoreTimeline) => setTimeline(next), []);
  const onError = useCallback(() => setProblem("load"), []);

  const addFile = async (file: File | undefined) => {
    if (!file) return;
    const entry = await library.add(file).catch(() => null);
    if (entry) setSelected(entry);
    else setProblem("file");
  };

  const removeSelected = async () => {
    await library.remove(selected.id);
    setSelected(library.scores[0]);
  };

  const running = view.status === "playing" || view.status === "waiting";
  const { hits, misses, wrong } = view.stats;

  return (
    <div className="w-full px-page-x pt-4 pb-page-y md:px-page-x-wide md:pt-5">
      <div className="mx-auto w-full max-w-6xl space-y-3">
        {/* the piece */}
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex min-w-48 cursor-pointer items-center justify-between gap-2 rounded-control border border-border bg-card px-3 py-2 text-t3 font-semibold text-fg-neutral hover:bg-muted">
              <span className="truncate">
                {selected.title}
                {selected.composer ? <span className="ml-1.5 font-normal text-fg-neutral-muted">{selected.composer}</span> : null}
              </span>
              <ChevronDown className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={selected.id}
                onValueChange={(id) => {
                  const entry = library.scores.find((s) => s.id === id);
                  if (entry) setSelected(entry);
                }}
              >
                {library.scores.map((s) => (
                  <DropdownMenuRadioItem key={s.id} value={s.id}>
                    {s.title}
                    {s.composer ? <span className="ml-1.5 text-fg-neutral-muted">{s.composer}</span> : null}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            <Plus /> {t("add")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".musicxml,.xml,.mxl"
            className="hidden"
            onChange={(e) => {
              void addFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {selected.source.kind === "local" ? (
            <Button variant="ghost" size="icon-sm" aria-label={t("remove")} onClick={() => void removeSelected()}>
              <Trash2 />
            </Button>
          ) : null}
          <div className="ml-auto">
            <MidiStatus inline midiName={midi.selectedDevice?.name} fallback={t("noMidiDevice")} />
          </div>
        </div>
        {problem ? <p className="text-t3 text-fg-critical">{t(problem === "file" ? "notAScore" : "loadFailed")}</p> : null}

        {/* how to practise */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Choice label={t("modeLabel")}>
            {MODES.map((m) => (
              <MonoPill key={m} active={practice.mode === m} onClick={() => practice.setMode(m)}>
                {t(`mode.${m}`)}
              </MonoPill>
            ))}
          </Choice>
          <Choice label={t("handsLabel")}>
            {HANDS.map((h) => (
              <MonoPill
                key={h}
                active={practice.hands === h}
                disabled={practice.mode === "listen"}
                onClick={() => practice.setHands(h)}
              >
                {t(`hands.${h}`)}
              </MonoPill>
            ))}
          </Choice>
          <Choice label={t("speedLabel")}>
            {SPEEDS.map((s) => (
              <MonoPill key={s} active={practice.speed === s} onClick={() => practice.setSpeed(s)}>
                {Math.round(s * 100)}%
              </MonoPill>
            ))}
          </Choice>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isAudioStarted ? (
            <Button onClick={startAudio}>
              <Play /> {t("soundOn")}
            </Button>
          ) : running ? (
            <Button onClick={practice.pause}>
              <Pause /> {t("pause")}
            </Button>
          ) : (
            <Button onClick={practice.play} disabled={!timeline || !isLoaded}>
              <Play /> {isLoaded ? t(view.cursor > 0 && view.status !== "finished" ? "resume" : "play") : t("loadingSound")}
            </Button>
          )}
          <Button variant="outline" size="icon" aria-label={t("restart")} onClick={practice.restart}>
            <RotateCcw />
          </Button>
          <p aria-live="polite" className="ml-1 text-t3 text-fg-neutral-muted">
            {view.status === "waiting"
              ? t("waiting")
              : view.status === "finished"
                ? practice.mode === "tempo"
                  ? t("finishedTempo", { hits, total: hits + misses, wrong })
                  : t("finished")
                : practice.mode === "tempo" && (hits || misses || wrong)
                  ? t("statsTempo", { hits, misses, wrong })
                  : practice.mode === "wait" && (hits || wrong)
                    ? t("statsWait", { hits, wrong })
                    : null}
          </p>
        </div>

        {/* the score: white paper, with its own scroll that follows the cursor */}
        <ScoreSheet
          source={source}
          cursorIndex={view.cursor}
          getPosition={practice.getPosition}
          onLoad={onLoad}
          onError={onError}
          className="max-h-[max(16rem,calc(100svh-30rem))] min-h-40 rounded-card border border-border bg-palette-gray-00 shadow-raised"
        />
        <p className="text-t2 text-fg-neutral-subtle">{t("localNote")}</p>

        <PianoKeyboard
          startMidi={KEYBOARD_START}
          endMidi={KEYBOARD_END}
          activeNotes={activeNotes}
          ringingNotes={view.expected}
          onNoteOn={mouse.onNoteOn}
          onNoteOff={mouse.onNoteOff}
          showShortcuts
          octave={keyboard.octave}
        />
      </div>
    </div>
  );
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-t2 font-semibold text-fg-neutral-muted">{label}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}
