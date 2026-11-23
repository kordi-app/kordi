"use client";

import dynamic from "next/dynamic";

/**
 * Audio pages (Tone.js / Web MIDI) touch browser-only APIs at import time,
 * so they are rendered on the client only. `ssr: false` must live in a client
 * component and `dynamic()` needs a literal import path, hence one entry per page.
 */

export const ChordPracticeView = dynamic(
  () => import("@/views/chord-practice").then((m) => m.ChordPracticePage),
  { ssr: false },
);

export const ChordQuizView = dynamic(
  () => import("@/views/chord-quiz").then((m) => m.ChordQuizPage),
  { ssr: false },
);

export const ChordAdventureView = dynamic(
  () => import("@/views/chord-adventure").then((m) => m.ChordAdventurePage),
  { ssr: false },
);

export const PianoView = dynamic(
  () => import("@/views/piano").then((m) => m.PianoPage),
  { ssr: false },
);

export const ScorePracticeView = dynamic(
  () => import("@/views/score-practice").then((m) => m.ScorePracticePage),
  { ssr: false },
);
