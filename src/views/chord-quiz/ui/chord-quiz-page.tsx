"use client";

import { useTranslations } from "next-intl";
import { usePianoInput } from "@/features/piano-player";
import { useQuizOrchestrator } from "@/features/quiz-game";
import { PianoKeyboard, MidiStatus } from "@/widgets/piano-keyboard";
import { ChordPrompt } from "@/widgets/chord-quiz-game";
import {
  DifficultySelect,
  QuizProgress,
  QuizResult,
  QuizFeedbackOverlay,
} from "@/widgets/quiz-game-panel";
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

  return (
    <main className="flex flex-1 flex-col items-center overflow-y-auto p-6">
      <QuizFeedbackOverlay feedback={feedbackState} />

      <MidiStatus
        midiName={midi.selectedDevice?.name}
        fallback={t("noMidiDevice")}
      />

      {state.phase === "select" && !isFetching && !showCountdown && (
        <div className="flex flex-1 items-center">
          <DifficultySelect onSelect={handleSelectDifficulty} isLoading={isFetching} />
        </div>
      )}

      {isFetching && !showCountdown && (
        <div className="flex flex-1 items-center">
          <p className="text-sm opacity-60">{t("loading")}</p>
        </div>
      )}

      {showCountdown && <Countdown onComplete={handleCountdownComplete} />}

      {state.phase === "playing" && currentChord && (
        <>
          <div className="mb-4">
            <QuizProgress
              currentIndex={state.currentIndex}
              totalCount={state.questions.length}
              timeLeft={state.timeLeft}
              totalScore={state.totalScore}
            />
          </div>

          <div className="mb-6">
            <ChordPrompt
              currentChord={{
                name: currentChord.name,
                rootIndex: 0,
                type: "",
                pitchClasses: [],
              }}
              nextChord={null}
              showNext={false}
              feedbackState={feedbackState}
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
        </>
      )}

      {state.phase === "result" && (
        <div className="flex flex-1 items-center">
          <QuizResult
            state={state}
            isSaving={scoreMutation.isPending}
            isSaved={scoreMutation.isSuccess}
            onRetry={handleRetry}
            onBackToSelect={handleBackToSelect}
          />
        </div>
      )}
    </main>
  );
}

