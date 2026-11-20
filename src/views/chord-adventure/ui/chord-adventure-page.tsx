"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { adventureQueries } from "@/entities/chord-adventure";
import { useAdventureGame } from "@/features/chord-adventure";
import { usePianoInput } from "@/features/piano-player";
import { AdventureStage } from "@/widgets/chord-adventure-stage";
import { MidiStatus, PianoKeyboard } from "@/widgets/piano-keyboard";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * Chord Adventure: the chord quiz as an endless run. The piano is the only
 * control — the game screen above plays itself out.
 */
export function ChordAdventurePage() {
  const t = useTranslations("chordAdventure");
  const { activeNotes, isAudioStarted, isLoaded, startAudio, keyboard, midi, mouse } = usePianoInput();
  const { view, clock, start, result, saving } = useAdventureGame({ activeNotes, isAudioStarted, startAudio });

  const showMenu = view.phase === "ready" || view.phase === "over";

  return (
    <div className="w-full px-page-x py-page-y md:px-page-x-wide md:py-page-y-wide">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <MidiStatus midiName={midi.selectedDevice?.name} fallback={t("noMidiDevice")} />

        <div className="relative">
          <AdventureStage view={view} clock={clock} />

          {showMenu ? (
            <div className="absolute inset-0 flex items-center justify-center bg-palette-gray-1000/35 p-4">
              <div className="w-full max-w-sm rounded-container bg-bg-layer-floating p-5 shadow-raised">
                {view.phase === "ready" ? (
                  <>
                    <h1 className="text-t7 font-bold text-fg-neutral">{t("title")}</h1>
                    <p className="mt-between-text text-t3 text-fg-neutral-muted">{t("intro")}</p>
                  </>
                ) : (
                  <>
                    <p className="text-t3 text-fg-neutral-muted">{t("gameOver")}</p>
                    <p className="mt-1 text-t9 font-bold text-fg-neutral">{t("defeated", { count: view.defeated })}</p>
                    <p className="mt-between-text h-5 text-t3 text-fg-neutral-muted">
                      {saving
                        ? t("saving")
                        : result
                          ? result.saved
                            ? t("newBest", { rank: result.rank })
                            : t("best", { count: result.bestDefeated, rank: result.rank })
                          : null}
                    </p>
                  </>
                )}
                <Button className="mt-4 w-full" size="lg" onClick={() => void start()}>
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

        <div
          className={cn("h-5 text-center text-t3 transition-opacity", isLoaded ? "opacity-0" : "opacity-60")}
          aria-hidden={isLoaded}
        >
          {t("loadingSamples")}
        </div>

        <PianoKeyboard
          activeNotes={activeNotes}
          onNoteOn={mouse.onNoteOn}
          onNoteOff={mouse.onNoteOff}
          showShortcuts
          octave={keyboard.octave}
        />
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
          <li key={entry.rank} className="flex items-baseline gap-2 text-t3 text-fg-neutral">
            <span className="w-4 tabular-nums text-fg-neutral-subtle">{entry.rank}</span>
            <span className="min-w-0 flex-1 truncate">{entry.nickname}</span>
            <span className="tabular-nums">{t("defeated", { count: entry.defeated })}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
