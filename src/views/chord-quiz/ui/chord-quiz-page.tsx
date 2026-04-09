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
import { AppHeader } from "@/widgets/app-header";
import { cn } from "@/shared/lib/utils";

export function ChordQuizPage() {
  const t = useTranslations("chordQuiz");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<QuizDifficulty | null>(null);
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
      startQuiz(selectedDifficulty, chords);
    }
  }, [chords, selectedDifficulty, state.phase, startQuiz]);

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
    duration: 10000,
    enabled: state.phase === "playing",
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
      setSelectedDifficulty(difficulty);
    },
    [],
  );

  const handleRetry = useCallback(() => {
    scoreMutation.reset();
    scoreSavedRef.current = false;
    quizStartedRef.current = false;
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
    setSelectedDifficulty(null);
    reset();
  }, [reset, scoreMutation]);

  if (!isAudioStarted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <button
          onClick={startAudio}
          className="glass glass-hover group flex flex-col items-center gap-4 rounded-2xl px-12 py-10 transition-all duration-300 hover:neon-glow"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-neon/10">
            <svg
              className="size-8 text-neon transition-transform group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">
              {t("clickToStart")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("audioDescription")}
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center pt-6">
      <AppHeader showBack />

      <QuizFeedbackOverlay feedback={feedbackState} />

      <div className="mb-2 flex w-full max-w-4xl justify-end px-4">
        {midi.selectedDevice ? (
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-neon">
            <span className="size-1.5 rounded-full bg-neon" />
            {midi.selectedDevice.name}
          </span>
        ) : (
          <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            {t("noMidiDevice")}
          </span>
        )}
      </div>

      {state.phase === "select" && !isFetching && (
        <div className="flex flex-1 items-center">
          <DifficultySelect
            onSelect={handleSelectDifficulty}
            isLoading={isFetching}
          />
        </div>
      )}

      {isFetching && (
        <div className="flex flex-1 items-center">
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      )}

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
            <div className="mb-4 text-sm text-muted-foreground">
              {t("loadingSamples")}
            </div>
          )}

          <div
            className={cn(
              "w-full max-w-4xl rounded-lg px-4 transition-shadow duration-200",
              feedbackState === "correct" &&
                "shadow-[0_0_25px_oklch(0.72_0.1_165/20%)]",
              feedbackState === "incorrect" &&
                "shadow-[0_0_25px_oklch(0.65_0.12_20/20%)]",
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
    </div>
  );
}
