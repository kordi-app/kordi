"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from "@/entities/chord-practice";
import { usePianoInput } from "@/features/piano-player";
import { useQuizGame } from "@/features/chord-practice";
import {
  PianoKeyboard,
  MidiStatus,
  AudioStartPrompt,
} from "@/widgets/piano-keyboard";
import { ChordPrompt } from "@/widgets/chord-prompt";
import {
  MetronomeDisplay,
  QuizScore,
  QuizControls,
  QuizSettingsPanel,
} from "@/widgets/chord-practice-game";
import { cn } from "@/shared/lib/utils";

export function ChordPracticePage() {
  const t = useTranslations("chordPractice");
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_QUIZ_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    activeNotes,
    isAudioStarted,
    isLoaded,
    startAudio,
    keyboard,
    midi,
    mouse,
  } = usePianoInput();

  const { state, feedbackState, metronome, start, stop, pause, resume } =
    useQuizGame(settings, activeNotes);

  if (!isAudioStarted) {
    return (
      <AudioStartPrompt
        title={t("clickToStart")}
        description={t("audioDescription")}
        onStart={startAudio}
      />
    );
  }

  const isIdle = state.status === "idle";

  return (
    <div className="w-full px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <MidiStatus
          midiName={midi.selectedDevice?.name}
          fallback={t("noMidiDevice")}
        />

        {isIdle ? (
          <div className="mx-auto w-full max-w-2xl">
            <QuizSettingsPanel
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
              chordName={state.currentChord?.name ?? null}
              nextChordName={state.nextChord?.name ?? null}
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

            <QuizScore state={state} />
          </div>
        )}

        <div className="flex justify-center">
          <QuizControls
            ns="chordPractice"
            status={state.status}
            bpm={settings.bpm}
            onStart={start}
            onStop={stop}
            onPause={pause}
            onResume={resume}
            onSettingsOpen={() => setSettingsOpen(true)}
          />
        </div>

        <div
          className={cn(
            "h-5 text-center text-sm transition-opacity duration-300",
            isLoaded ? "opacity-0" : "opacity-60",
          )}
          aria-hidden={isLoaded}
        >
          {t("loadingSamples")}
        </div>

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

      {!isIdle && (
        <QuizSettingsPanel
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
