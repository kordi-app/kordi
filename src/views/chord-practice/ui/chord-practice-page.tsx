"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Piano } from "lucide-react";
import { DEFAULT_QUIZ_SETTINGS, type QuizSettings } from "@/entities/chord-quiz";
import { usePianoInput } from "@/features/piano-player";
import { useQuizGame } from "@/features/chord-quiz";
import { PianoKeyboard } from "@/widgets/piano-keyboard";
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
      <main className="flex flex-1 items-center justify-center p-6">
        <button
          onClick={startAudio}
          className="group flex flex-col items-center gap-4 rounded-lg border border-black bg-white px-12 py-10 transition-all hover:bg-black hover:text-white"
        >
          <div className="flex size-16 items-center justify-center rounded-lg border border-black bg-black text-white transition-all group-hover:bg-white group-hover:text-black">
            <Piano className="size-8" strokeWidth={1.75} />
          </div>
          <div className="text-center">
            <p className="font-heading text-lg font-bold uppercase tracking-wider">
              {t("clickToStart")}
            </p>
            <p className="mt-1 text-sm opacity-70">{t("audioDescription")}</p>
          </div>
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center overflow-y-auto p-6">
      {/* MIDI Status */}
      <div className="mb-2 flex w-full max-w-4xl justify-end">
        {midi.selectedDevice ? (
          <span className="flex items-center gap-1.5 rounded-full border border-black bg-black px-3 py-1 text-xs font-bold uppercase text-white">
            <span className="size-1.5 rounded-full bg-white" />
            {midi.selectedDevice.name}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-black bg-white px-3 py-1 text-xs font-bold uppercase text-black">
            <span className="size-1.5 rounded-full bg-black opacity-40" />
            {t("noMidiDevice")}
          </span>
        )}
      </div>

      {/* Idle: show inline settings */}
      {state.status === "idle" && (
        <div className="mb-6 w-full max-w-md">
          <QuizSettingsPanel
            ns="chordPractice"
            settings={settings}
            onChange={setSettings}
            onClose={() => {}}
            isOpen={true}
            inline={true}
          />
        </div>
      )}

      {/* Playing/Paused */}
      {state.status !== "idle" && (
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

      {/* Controls */}
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

      {/* Loading */}
      {!isLoaded && (
        <div className="mb-4 text-sm opacity-60">{t("loadingSamples")}</div>
      )}

      {/* Piano Keyboard with feedback ring */}
      <div
        className={cn(
          "w-full max-w-4xl rounded-lg transition-all duration-200",
          feedbackState === "correct" && "ring-2 ring-black",
          feedbackState === "incorrect" && "ring-2 ring-black ring-offset-2 ring-offset-white"
        )}
      >
        <PianoKeyboard
          activeNotes={activeNotes}
          onNoteOn={mouse.onNoteOn}
          onNoteOff={mouse.onNoteOff}
          showShortcuts={true}
          octave={keyboard.octave}
        />
      </div>

      {/* Settings Panel (slide-out, only when playing/paused) */}
      {state.status !== "idle" && (
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
