"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { adventureQueries } from "@/entities/chord-adventure";
import { useAdventureGame } from "@/features/chord-adventure";
import { usePianoInput } from "@/features/piano-player";
import { AdventureStage } from "@/widgets/chord-adventure-stage";
import { MidiStatus, PracticeKeyboard } from "@/widgets/piano-keyboard";
import { Button } from "@/shared/ui/button";

/**
 * Chord Adventure: the chord quiz as an endless run. The piano is the only
 * control — the game screen above plays itself out.
 */
export function ChordAdventurePage() {
  const t = useTranslations("chordAdventure");
  const piano = usePianoInput();
  const { activeNotes, isAudioStarted, startAudio, midi } = piano;
  const { view, clock, start, result, problem, saving } = useAdventureGame({ activeNotes, isAudioStarted, startAudio });
  const action = useRef<HTMLButtonElement>(null);

  const showMenu = view.phase === "ready" || view.phase === "over";

  // when the run ends, put focus on "try again" (keyboard players needn't hunt for it)
  useEffect(() => {
    if (view.phase === "over") action.current?.focus();
  }, [view.phase]);

  return (
    // sits high on the page: the game screen and the keyboard should fit in one view
    <div className="w-full px-page-x pt-4 pb-page-y md:px-page-x-wide md:pt-5">
      {/* the game screen (2:1) and the keyboard share one width: as wide as the window allows,
          but short enough that the keyboard stays visible below (~24rem for keyboard + chrome) */}
      <div className="mx-auto w-full max-w-[min(80rem,max(26rem,calc((100svh-24rem)*2)))] space-y-3">
        <div className="flex justify-end">
          <MidiStatus inline midiName={midi.selectedDevice?.name} fallback={t("noMidiDevice")} />
        </div>

        <div className="relative w-full">
          <AdventureStage view={view} clock={clock} />

          {/* over the screen where it fits; on phones the screen is too short for it, so it sits below */}
          {showMenu ? (
            <div className="mt-3 flex justify-center sm:absolute sm:rounded-card sm:inset-0 sm:mt-0 sm:items-center sm:bg-palette-gray-1000/35 sm:p-4">
              <div role="status" aria-live="polite" className="w-full max-w-sm rounded-container bg-bg-layer-floating p-5 shadow-raised">
                {view.phase === "ready" ? (
                  <>
                    <h1 className="text-t7 font-bold text-fg-neutral">{t("title")}</h1>
                    <p className="mt-between-text text-t3 text-fg-neutral-muted">{t("intro")}</p>
                    {problem === "chords" ? <p className="mt-2 text-t3 text-fg-critical">{t("chordsFailed")}</p> : null}
                  </>
                ) : (
                  <>
                    <p className="text-t3 text-fg-neutral-muted">{t("gameOver")}</p>
                    <p className="mt-1 text-t9 font-bold text-fg-neutral">{t("defeated", { count: view.defeated })}</p>
                    <p className="mt-between-text h-5 text-t3 text-fg-neutral-muted">
                      {saving
                        ? t("saving")
                        : problem === "save"
                          ? t("saveFailed")
                          : result
                            ? result.saved
                            ? t("newBest", { rank: result.rank })
                            : t("best", { count: result.bestDefeated, rank: result.rank })
                          : null}
                    </p>
                  </>
                )}
                <Button ref={action} className="mt-4 w-full" size="lg" onClick={() => void start()}>
                  {view.phase === "ready" ? t("start") : t("retry")}
                </Button>
                <TopRuns />
              </div>
            </div>
          ) : null}
          {view.phase === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center text-t4 text-fg-neutral-inverted">
              {t("loading")}
            </div>
          ) : null}
        </div>

        <PracticeKeyboard input={piano} />
      </div>
    </div>
  );
}

/** All-time top runs, under the start / retry button. */
function TopRuns() {
  const t = useTranslations("chordAdventure");
  const { data } = useQuery(adventureQueries.rankings());
  if (!data || data.length === 0) return null;
  return (
    <div className="mt-5 border-t border-stroke-neutral-subtle pt-3">
      <p className="text-t1 font-medium text-fg-neutral-subtle">{t("ranking")}</p>
      <ol className="mt-1.5 space-y-1">
        {data.slice(0, 5).map((entry) => (
          <li key={`${entry.rank}-${entry.nickname}`} className="flex items-baseline gap-2 text-t3 text-fg-neutral">
            <span className="w-4 tabular-nums text-fg-neutral-subtle">{entry.rank}</span>
            <span className="min-w-0 flex-1 truncate">{entry.nickname}</span>
            <span className="tabular-nums">{t("defeated", { count: entry.defeated })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
