"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_DRILL_SETTINGS, type DrillSettings } from "@/entities/chord-practice";
import { usePianoInput } from "@/features/piano-player";
import { useDrillGame } from "@/features/chord-practice";
import {
  KeyboardBar,
  MidiStatus,
  PianoKeyboard,
} from "@/widgets/piano-keyboard";
import { ChordPrompt } from "@/widgets/chord-prompt";
import {
  MetronomeDisplay,
  DrillScore,
  DrillControls,
  DrillSettingsPanel,
} from "@/widgets/chord-practice-game";
import { displaySuffix } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";

/**
 * Practice names are already spelled for the chosen key (Bbmaj7 in F major),
 * so only the suffix is re-written in chart style: maj → M (Bbmaj7 → BbM7).
 */
const practiceChordLabel = (name: string | undefined) => (name ? displaySuffix(name) : null);

export function ChordPracticePage() {
  const t = useTranslations("chordPractice");
  const [settings, setSettings] = useState<DrillSettings>(DEFAULT_DRILL_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    activeNotes,
    isAudioStarted,
    isLoaded,
    startAudio,
    keyboard,
    midi,
    mouse,
    sound,
  } = usePianoInput();

  const { state, feedbackState, metronome, start, stop, pause, resume } =
    useDrillGame(settings, activeNotes);

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
              chordName={practiceChordLabel(state.currentChord?.name)}
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
            bpm={settings.bpm}
            onStart={startWithSound}
            onStop={stop}
            onPause={pause}
            onResume={resume}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        </div>

        {/* the bar and the keyboard share one width (the keyboard\'s, or the page\'s if it scrolls) */}
        <div className="mx-auto w-fit max-w-full">
        <KeyboardBar
          loading={isAudioStarted && !isLoaded}
          octave={keyboard.octave}
          isMuted={sound.isMuted}
          onToggleMute={sound.toggleMute}
        />
        <div
          className={cn(
            "w-full rounded-lg transition-all duration-200",
            feedbackState === "correct" && "ring-2 ring-ring",
            feedbackState === "incorrect" &&
              "ring-2 ring-ring ring-offset-2 ring-offset-background",
          )}
        >
          <PianoKeyboard
            activeNotes={activeNotes}
            onNoteOn={mouse.onNoteOn}
            onNoteOff={mouse.onNoteOff}
            showShortcuts
            octave={keyboard.octave}
          />
        </div>
        </div>
      </div>

      {!isIdle && (
        <DrillSettingsPanel
          ns="chordPractice"
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          isOpen={settingsOpen}
        />
      )}
    </div>
  );
}
