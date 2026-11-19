import type { Metadata } from "next";
import { ChordPracticeView } from "../client-only-views";

export const metadata: Metadata = {
  title: "Chord Practice | Kordi",
  description: "Practice chords with random chord flash cards",
};

export default function Page() {
  return <ChordPracticeView />;
}
