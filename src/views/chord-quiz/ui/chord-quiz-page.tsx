"use client";

import { useTranslations } from "next-intl";
import { usePianoInput } from "@/features/piano-player";
import { useQuizOrchestrator } from "@/features/chord-quiz";
import { PianoKeyboard, MidiStatus } from "@/widgets/piano-keyboard";
import { ChordPrompt } from "@/widgets/chord-prompt";
import {
  DifficultySelect,
  QuizProgress,
  QuizResult,
  QuizFeedbackOverlay,
} from "@/widgets/chord-quiz-panel";
import { toDisplayChordName } from "@/shared/lib/music";
import { Countdown } from "@/shared/ui/countdown";
import { cn } from "@/shared/lib/utils";

export function ChordQuizPage() {
  const t = useTranslations("chordQuiz");
  const { activeNotes, isAudioStarted, isLoaded, startAudio, keyboard, midi, mouse } =
    usePianoInput();

  const {
    state,
    currentChord,
    feedbackState,
    showCountdown,
    isFetching,
    scoreMutation,
    handleSelectDifficulty,
    handleCountdownComplete,
    handleRetry,
    handleBackToSelect,
  } = useQuizOrchestrator({ activeNotes, isAudioStarted, startAudio });

  const isPlaying = state.phase === "playing";

  return (
    <>
      <QuizFeedbackOverlay feedback={feedbackState} />

      {/* Centered phases: select / loading / countdown / result */}
      {!isPlaying && (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-10 px-6 py-10">
          {state.phase === "select" && !isFetching && !showCountdown && (
            <DifficultySelect
              onSelect={handleSelectDifficulty}
              isLoading={isFetching}
            />
          )}

          {isFetching && !showCountdown && (
            <p className="text-sm opacity-60">{t("loading")}</p>
          )}

          {showCountdown && <Countdown onComplete={handleCountdownComplete} />}

          {state.phase === "result" && (
            <QuizResult
              state={state}
              isSaving={scoreMutation.isPending}
              isSaved={scoreMutation.isSuccess}
              onRetry={handleRetry}
              onBackToSelect={handleBackToSelect}
            />
          )}
        </div>
      )}

      {/* Playing phase: chord-practice-style top-aligned layout */}
      {isPlaying && currentChord && (
        <div className="w-full px-6 py-10 md:px-8 md:py-14">
          <div className="mx-auto w-full max-w-4xl space-y-10">
            <MidiStatus
              midiName={midi.selectedDevice?.name}
              fallback={t("noMidiDevice")}
            />

            <QuizProgress
              currentIndex={state.currentIndex}
              totalCount={state.questions.length}
              timeLeft={state.timeLeft}
              totalScore={state.totalScore}
            />

            <div className="flex flex-col items-center gap-6">
              <ChordPrompt
                ns="chordQuiz"
                chordName={toDisplayChordName(currentChord.name)}
                feedbackState={feedbackState}
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
        </div>
      )}
    </>
  );
}
