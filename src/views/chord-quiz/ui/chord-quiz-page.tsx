"use client";

import { useTranslations } from "next-intl";
import { usePianoInput } from "@/features/piano-player";
import { getTotalScore } from "@/entities/chord-quiz";
import { useQuizOrchestrator } from "@/features/chord-quiz";
import { KeyboardBar, MidiStatus, PianoKeyboard } from "@/widgets/piano-keyboard";
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
  const { activeNotes, isAudioStarted, isLoaded, startAudio, keyboard, midi, mouse, sound } =
    usePianoInput();

  const {
    state,
    currentChord,
    feedbackState,
    showCountdown,
    isFetching,
    loadFailed,
    scoreMutation,
    handleSelectDifficulty,
    handleCountdownComplete,
    handleRetry,
    handleBackToSelect,
  } = useQuizOrchestrator({ activeNotes, isAudioStarted, startAudio });

  const isPlaying = state.phase === "playing";
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

          {showCountdown && <Countdown onComplete={handleCountdownComplete} />}

          {state.phase === "result" && (
            <QuizResult
              state={state}
              isSaving={scoreMutation.isPending}
              isSaved={scoreMutation.isSuccess}
              saveFailed={scoreMutation.isError}
              onRetrySave={() => {
                if (scoreMutation.variables) scoreMutation.mutate(scoreMutation.variables);
              }}
              onRetry={handleRetry}
              onBackToSelect={handleBackToSelect}
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

            <QuizProgress
              currentIndex={state.currentIndex}
              totalCount={state.questions.length}
              timeLeft={state.timeLeft}
              totalScore={totalScore}
            />

            <div className="flex flex-col items-center gap-6">
              <ChordPrompt
                ns="chordQuiz"
                chordName={toDisplayChordName(currentChord.name)}
                feedbackState={feedbackState}
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
        </div>
      )}
    </>
  );
}
