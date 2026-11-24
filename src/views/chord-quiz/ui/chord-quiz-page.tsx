"use client";

import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { usePianoInput } from "@/features/piano-player";
import { getTotalScore } from "@/entities/chord-quiz";
import { useQuizOrchestrator } from "@/features/chord-quiz";
import { MidiStatus, PracticeKeyboard } from "@/widgets/piano-keyboard";
import { ChordPrompt } from "@/widgets/chord-prompt";
import {
  DifficultySelect,
  QuizProgress,
  QuizResult,
  QuizFeedbackOverlay,
} from "@/widgets/chord-quiz-panel";
import { toDisplayChordName } from "@/shared/lib/music";
import { Countdown } from "@/shared/ui/countdown";
import { useStoreValue, type ValueStore } from "@/shared/lib/react/value-store";

export function ChordQuizPage() {
  const t = useTranslations("chordQuiz");
  const piano = usePianoInput();
  const { activeNotes, isAudioStarted, startAudio, midi } = piano;

  const {
    state,
    currentChord,
    feedbackState,
    timeLeft,
    showCountdown,
    countdownSeconds,
    isFetching,
    loadFailed,
    resultMutation,
    canRetrySubmit,
    handleSelectDifficulty,
    handleCountdownComplete,
    handleRetry,
    handleRetrySubmit,
    handleBackToSelect,
  } = useQuizOrchestrator({ activeNotes, isAudioStarted, startAudio });

  const isPlaying = state.phase === "playing";
  // provisional running total (local instant feedback); the result screen shows the server's
  const totalScore = getTotalScore(state.answers);

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

          {state.phase === "select" && loadFailed && !isFetching && (
            <p role="alert" className="text-sm text-destructive">
              {t("loadError")}
            </p>
          )}

          {isFetching && !showCountdown && (
            <p className="text-sm opacity-60">{t("loading")}</p>
          )}

          {showCountdown && (
            <Countdown from={countdownSeconds} onComplete={handleCountdownComplete} />
          )}

          {state.phase === "result" && (
            <QuizResult
              state={state}
              result={resultMutation.data}
              isSaving={resultMutation.isPending}
              saveFailed={resultMutation.isError}
              onRetrySave={canRetrySubmit ? handleRetrySubmit : undefined}
              onRetry={handleRetry}
              onBackToSelect={handleBackToSelect}
              muted={piano.sound.isMuted}
            />
          )}
        </div>
      )}

      {/* Playing phase: chord-practice-style top-aligned layout */}
      {isPlaying && currentChord && (
        <div className="w-full px-page-x pt-4 pb-page-y md:px-page-x-wide md:pt-5">
          <div className="mx-auto w-full max-w-[44rem] space-y-10">
            <div className="flex justify-end">
              <MidiStatus inline midiName={midi.selectedDevice?.name} fallback={t("noMidiDevice")} />
            </div>

            <LiveQuizProgress
              currentIndex={state.currentIndex}
              totalCount={state.questions.length}
              timeLeft={timeLeft}
              timePerQuestionMs={state.timePerQuestionMs}
              totalScore={totalScore}
            />

            <div className="flex flex-col items-center gap-6">
              <ChordPrompt
                ns="chordQuiz"
                chordName={toDisplayChordName(currentChord.name)}
                feedbackState={feedbackState}
              />
            </div>

            <PracticeKeyboard input={piano} feedback={feedbackState} />
          </div>
        </div>
      )}
    </>
  );
}

/** Subscribes to the countdown so only the progress bar re-renders as it ticks. */
function LiveQuizProgress({
  timeLeft,
  ...props
}: Omit<ComponentProps<typeof QuizProgress>, "timeLeft"> & { timeLeft: ValueStore<number> }) {
  return <QuizProgress {...props} timeLeft={useStoreValue(timeLeft)} />;
}
