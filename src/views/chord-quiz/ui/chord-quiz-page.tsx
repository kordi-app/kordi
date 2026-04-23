"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "@tanstack/react-query";
import { usePianoInput } from "@/features/piano-player";
import {
  useQuizGameState,
  useQuizTimer,
  useQuizChordCheck,
  useQuizFeedback,
  saveScore,
} from "@/features/quiz-game";
import { quizQueries, type QuizDifficulty } from "@/entities/quiz";
import { PianoKeyboard } from "@/widgets/piano-keyboard";
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
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<QuizDifficulty | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const quizStartedRef = useRef(false);

  const {
    activeNotes,
    isAudioStarted,
    isLoaded,
    startAudio,
    keyboard,
    midi,
    mouse,
  } = usePianoInput();

  const {
    state,
    startQuiz,
    answerCorrect,
    answerIncorrect,
    answerTimeout,
    tick,
    reset,
  } = useQuizGameState();

  const { feedbackState, showCorrect, showIncorrect, showTimeout } =
    useQuizFeedback();

  const { data: chords, isFetching } = useQuery({
    ...quizQueries.chords(selectedDifficulty!),
    enabled: selectedDifficulty !== null,
  });

  const scoreMutation = useMutation({
    mutationFn: saveScore,
  });

  useEffect(() => {
    if (
      chords &&
      chords.length > 0 &&
      selectedDifficulty &&
      state.phase === "select" &&
      !quizStartedRef.current
    ) {
      quizStartedRef.current = true;
      setShowCountdown(true);
    }
  }, [chords, selectedDifficulty, state.phase]);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    if (selectedDifficulty && chords) {
      startQuiz(selectedDifficulty, chords);
    }
  }, [selectedDifficulty, chords, startQuiz]);

  const scoreSavedRef = useRef(false);
  useEffect(() => {
    if (
      state.phase === "result" &&
      state.difficulty &&
      !scoreSavedRef.current
    ) {
      scoreSavedRef.current = true;
      scoreMutation.mutate({
        difficulty: state.difficulty,
        totalScore: state.totalScore,
        correctCount: state.answers.filter((a) => a === "correct").length,
        totalCount: state.questions.length,
      });
    }
  }, [
    state.phase,
    state.difficulty,
    state.totalScore,
    state.answers,
    state.questions.length,
    scoreMutation,
  ]);

  const currentChord =
    state.phase === "playing" ? state.questions[state.currentIndex] : null;

  const handleTimeout = useCallback(() => {
    showTimeout();
    answerTimeout();
  }, [answerTimeout, showTimeout]);

  useQuizTimer({
    duration: 20000,
    enabled: state.phase === "playing",
    resetKey: state.currentIndex,
    onTick: tick,
    onTimeout: handleTimeout,
  });

  const handleCorrect = useCallback(
    (score: number) => {
      showCorrect();
      answerCorrect(score);
    },
    [answerCorrect, showCorrect],
  );

  const handleIncorrect = useCallback(() => {
    showIncorrect();
    answerIncorrect();
  }, [answerIncorrect, showIncorrect]);

  useQuizChordCheck({
    currentChord,
    activeNotes,
    timeLeft: state.timeLeft,
    enabled: state.phase === "playing",
    onCorrect: handleCorrect,
    onIncorrect: handleIncorrect,
  });

  const handleSelectDifficulty = useCallback(
    (difficulty: QuizDifficulty) => {
      if (!isAudioStarted) startAudio();
      setSelectedDifficulty(difficulty);
    },
    [isAudioStarted, startAudio],
  );

  const handleRetry = useCallback(() => {
    scoreMutation.reset();
    scoreSavedRef.current = false;
    quizStartedRef.current = false;
    setShowCountdown(false);
    reset();
    if (selectedDifficulty) {
      setSelectedDifficulty(null);
      setTimeout(() => setSelectedDifficulty(selectedDifficulty), 0);
    }
  }, [selectedDifficulty, reset, scoreMutation]);

  const handleBackToSelect = useCallback(() => {
    scoreMutation.reset();
    scoreSavedRef.current = false;
    quizStartedRef.current = false;
    setShowCountdown(false);
    setSelectedDifficulty(null);
    reset();
  }, [reset, scoreMutation]);

  return (
    <main className="flex flex-1 flex-col items-center overflow-y-auto p-6">
      <QuizFeedbackOverlay feedback={feedbackState} />

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

      {state.phase === "select" && !isFetching && !showCountdown && (
        <div className="flex flex-1 items-center">
          <DifficultySelect
            onSelect={handleSelectDifficulty}
            isLoading={isFetching}
          />
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
            <div className="mb-4 text-sm opacity-60">
              {t("loadingSamples")}
            </div>
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
              showShortcuts={true}
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
