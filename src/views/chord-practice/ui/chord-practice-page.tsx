"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_DRILL_SETTINGS, type DrillSettings } from "@/entities/chord-practice";
import { usePianoInput } from "@/features/piano-player";
import { useDrillGame } from "@/features/chord-practice";
import {
  MidiStatus,
  PracticeKeyboard,
} from "@/widgets/piano-keyboard";
import { ChordPrompt } from "@/widgets/chord-prompt";
import {
  MetronomeDisplay,
  DrillScore,
  DrillControls,
  DrillSettingsPanel,
} from "@/widgets/chord-practice-game";
import { displaySuffix } from "@/shared/lib/music";

/**
 * Practice names are already spelled for the chosen key (Bbmaj7 in F major),
 * so only the suffix is re-written in chart style: maj → M (Bbmaj7 → BbM7).
 */
const practiceChordLabel = (name: string | undefined) => (name ? displaySuffix(name) : null);

export function ChordPracticePage() {
  const t = useTranslations("chordPractice");
  const [settings, setSettings] = useState<DrillSettings>(DEFAULT_DRILL_SETTINGS);

  const piano = usePianoInput();
  const { activeNotes, isAudioStarted, startAudio, midi } = piano;

  const { state, feedbackState, hint, metronome, start, stop, pause, resume } =
    useDrillGame(settings, activeNotes);
  const current = state.currentChord;

  // the start button is the gesture that unlocks sound (no separate prompt)
  const startWithSound = () => {
    if (!isAudioStarted) startAudio();
    start();
  };

  const isIdle = state.status === "idle";

  return (
    <div className="w-full px-page-x pt-4 pb-page-y md:px-page-x-wide md:pt-5">
      <div className="mx-auto w-full max-w-[44rem] space-y-10">
        <div className="flex justify-end">
          <MidiStatus inline midiName={midi.selectedDevice?.name} fallback={t("noMidiDevice")} />
        </div>

        {isIdle ? (
          <div className="mx-auto w-full max-w-2xl">
            <DrillSettingsPanel
              ns="chordPractice"
              settings={settings}
              onChange={setSettings}
              onClose={() => {}}
              isOpen
              inline
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <ChordPrompt
              ns="chordPractice"
              chordName={practiceChordLabel(current?.name)}
              caption={current?.numeral ? `${current.keyName} · ${current.numeral}` : null}
              hintNotes={settings.showHints ? (hint?.labels ?? null) : undefined}
              nextChordName={practiceChordLabel(state.nextChord?.name)}
              showNext={settings.showNextChord}
              feedbackState={feedbackState}
            />

            {settings.metronomeVisualEnabled && (
              <MetronomeDisplay
                beatsPerBar={metronome.beatsPerBar}
                currentBeat={metronome.currentBeat}
                isPlaying={metronome.isPlaying}
              />
            )}

            <DrillScore state={state} />
          </div>
        )}

        <div className="flex justify-center">
          <DrillControls
            ns="chordPractice"
            status={state.status}
            onStart={startWithSound}
            onStop={stop}
            onPause={pause}
            onResume={resume}
          />
        </div>

        <PracticeKeyboard input={piano} feedback={feedbackState} hintNotes={isIdle ? undefined : hint?.midi} />
      </div>
    </div>
  );
}
