"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { NotebookPen } from "lucide-react";
import { REVIEW_DECK_SIZE, reviewQueries, type ReviewCard } from "@/entities/chord-review";
import { usePianoInput } from "@/features/piano-player";
import { firstTryCorrect, useReviewDrill } from "@/features/chord-practice";
import { MidiStatus, PracticeKeyboard } from "@/widgets/piano-keyboard";
import { ChordPrompt } from "@/widgets/chord-prompt";
import { toDisplayChordName } from "@/shared/lib/music";
import { Link } from "@/shared/config/i18n/navigation";
import { ROUTES } from "@/shared/config/routes";
import { Button, buttonVariants } from "@/shared/ui/button";
import { EmptyState, LoadingState } from "@/shared/ui/empty-state";
import { MonoCard } from "@/shared/ui/mono-card";
import { SectionHeader } from "@/shared/ui/section-header";
import { cn } from "@/shared/lib/utils";

/** 오늘의 복습: 퀴즈·복습에서 약했던 코드를 서버가 정한 순서대로 다시 친다. */
export function ChordReviewPage() {
  const t = useTranslations("chordReview");
  const piano = usePianoInput();
  const { activeNotes, isAudioStarted, startAudio, midi } = piano;
  const deck = useQuery(reviewQueries.deck(REVIEW_DECK_SIZE));
  const drill = useReviewDrill(activeNotes);

  const startWithSound = (cards: ReviewCard[]) => {
    if (!isAudioStarted) startAudio();
    drill.start(cards.map((c) => ({ chordId: c.chord.id, name: c.chord.name })));
  };

  const playing = drill.state?.status === "playing";

  return (
    <div className="w-full px-page-x pt-4 pb-page-y md:px-page-x-wide md:pt-5">
      <div className="mx-auto w-full max-w-[44rem] space-y-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={ROUTES.CHORD_PRACTICE}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            ← {t("backToPractice")}
          </Link>
          <MidiStatus inline midiName={midi.selectedDevice?.name} fallback={t("noMidiDevice")} />
        </div>

        {drill.state === null ? (
          <DeckIntro
            isLoading={deck.isPending}
            isError={deck.isError}
            cards={deck.data?.cards ?? []}
            dueCount={deck.data?.dueCount ?? 0}
            onRetry={() => deck.refetch()}
            onStart={startWithSound}
          />
        ) : playing && drill.current ? (
          <div className="flex flex-col items-center gap-6">
            <p className="text-xs font-semibold uppercase tracking-widest tabular-nums opacity-70">
              {t("progress", {
                done: drill.state.outcomes.length,
                total: drill.state.total,
              })}
            </p>
            <ChordPrompt
              ns="chordPractice"
              chordName={toDisplayChordName(drill.current.name)}
              feedbackState={drill.feedbackState}
            />
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={drill.skip}>
                {t("skip")}
              </Button>
              <Button variant="ghost" size="sm" onClick={drill.reset}>
                {t("stop")}
              </Button>
            </div>
          </div>
        ) : (
          <ReviewSummary
            correct={drill.state ? firstTryCorrect(drill.state) : 0}
            total={drill.state?.outcomes.length ?? 0}
            isSaving={drill.save.isPending}
            saved={drill.save.isSuccess}
            saveFailed={drill.save.isError}
            dueLeft={drill.save.data?.dueCount}
            onRetrySave={drill.retrySave}
            onAgain={drill.reset}
          />
        )}

        {playing ? <PracticeKeyboard input={piano} feedback={drill.feedbackState} /> : null}
      </div>
    </div>
  );
}

interface DeckIntroProps {
  isLoading: boolean;
  isError: boolean;
  cards: ReviewCard[];
  dueCount: number;
  onRetry: () => void;
  onStart: (cards: ReviewCard[]) => void;
}

function DeckIntro({ isLoading, isError, cards, dueCount, onRetry, onStart }: DeckIntroProps) {
  const t = useTranslations("chordReview");

  if (isLoading) return <LoadingState label={t("loading")} />;
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-12 text-sm">
        <span className="opacity-60">{t("loadError")}</span>
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          icon={<NotebookPen className="size-5" aria-hidden />}
          label={t("emptyTitle")}
          hint={t("emptyHint")}
        />
        <Link href={ROUTES.CHORD_QUIZ} className={buttonVariants({ size: "lg" })}>
          {t("goQuiz")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <SectionHeader as="h1" size="lg">
        {t("title")}
      </SectionHeader>
      <p className="text-sm opacity-70">
        {dueCount > 0 ? t("dueCount", { count: dueCount }) : t("nothingDue")}
      </p>
      <ul className="flex flex-wrap justify-center gap-2">
        {cards.map((card) => (
          <li key={card.chord.id}>
            <MonoCard
              className={cn("px-3 py-2 text-center", !card.due && "opacity-60")}
              title={t("record", { correct: card.correctCount, wrong: card.wrongCount })}
            >
              <span className="font-heading font-semibold">
                {toDisplayChordName(card.chord.name)}
              </span>
            </MonoCard>
          </li>
        ))}
      </ul>
      <Button size="lg" onClick={() => onStart(cards)}>
        {t("start")}
      </Button>
    </div>
  );
}

interface ReviewSummaryProps {
  correct: number;
  total: number;
  isSaving: boolean;
  saved: boolean;
  saveFailed: boolean;
  dueLeft?: number;
  onRetrySave: () => void;
  onAgain: () => void;
}

function ReviewSummary({
  correct,
  total,
  isSaving,
  saved,
  saveFailed,
  dueLeft,
  onRetrySave,
  onAgain,
}: ReviewSummaryProps) {
  const t = useTranslations("chordReview");
  return (
    <div className="flex flex-col items-center gap-6">
      <SectionHeader as="h2" size="md">
        {t("doneTitle")}
      </SectionHeader>
      <div className="rounded-lg border border-border bg-primary px-10 py-6 text-center text-primary-foreground">
        <div className="font-heading text-4xl font-semibold tabular-nums">
          {correct} / {total}
        </div>
        <div className="mt-1 text-xs font-semibold uppercase tracking-widest opacity-70">
          {t("firstTry")}
        </div>
      </div>
      {isSaving ? <p className="text-sm opacity-60">{t("saving")}</p> : null}
      {saved ? (
        <p className="text-xs font-semibold uppercase tracking-widest">
          {dueLeft !== undefined && dueLeft > 0 ? t("dueLeft", { count: dueLeft }) : t("allDone")}
        </p>
      ) : null}
      {saveFailed ? (
        <div role="alert" className="flex items-center gap-3 text-sm">
          <span className="text-destructive">{t("saveError")}</span>
          <Button size="sm" variant="outline" onClick={onRetrySave}>
            {t("retrySave")}
          </Button>
        </div>
      ) : null}
      <div className="flex gap-3">
        <Button size="lg" onClick={onAgain} disabled={isSaving}>
          {t("again")}
        </Button>
        <Link
          href={ROUTES.CHORD_PRACTICE}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          {t("backToPractice")}
        </Link>
      </div>
    </div>
  );
}
