"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from "@/entities/chord-quiz";
import { usePianoInput } from "@/features/piano-player";
import { useQuizGame } from "@/features/chord-quiz";
import {
  PianoKeyboard,
  MidiStatus,
  AudioStartPrompt,
} from "@/widgets/piano-keyboard";
import {
  ChordPrompt,
  MetronomeDisplay,
  QuizScore,
  QuizControls,
  QuizSettingsPanel,
} from "@/widgets/chord-quiz-game";
import { cn } from "@/shared/lib/utils";

export function ChordPracticePage() {
  const t = useTranslations("chordPractice");
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_QUIZ_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { activeNotes, isAudioStarted, isLoaded, startAudio, keyboard, midi, mouse } =
    usePianoInput();

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
    <main className="flex flex-1 flex-col items-center overflow-y-auto p-6">
      <MidiStatus
        midiName={midi.selectedDevice?.name}
        fallback={t("noMidiDevice")}
      />

      {isIdle && (
        <div className="mb-6 w-full max-w-md">
          <QuizSettingsPanel
            ns="chordPractice"
            settings={settings}
            onChange={setSettings}
            onClose={() => {}}
            isOpen
            inline
          />
        </div>
      )}

      {!isIdle && (
        <>
          <div className="mb-4">
            <ChordPrompt
              currentChord={state.currentChord}
              nextChord={state.nextChord}
              showNext={settings.showNextChord}
              feedbackState={feedbackState}
            />
          </div>

          {settings.metronomeVisualEnabled && (
            <div className="mb-4">
              <MetronomeDisplay
                beatsPerBar={metronome.beatsPerBar}
                currentBeat={metronome.currentBeat}
                isPlaying={metronome.isPlaying}
              />
            </div>
          )}

          <div className="mb-4">
            <QuizScore state={state} />
          </div>
        </>
      )}

      <div className="mb-6">
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

      {!isLoaded && (
        <div className="mb-4 text-sm opacity-60">{t("loadingSamples")}</div>
      )}

      <div
        className={cn(
          "w-full max-w-4xl rounded-lg transition-all duration-200",
          feedbackState === "correct" && "ring-2 ring-black",
          feedbackState === "incorrect" &&
            "ring-2 ring-black ring-offset-2 ring-offset-white",
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

      {!isIdle && (
        <QuizSettingsPanel
          ns="chordPractice"
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          isOpen={settingsOpen}
        />
      )}
    </main>
  );
}
