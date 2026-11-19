import type { Metadata } from "next";
import { ChordQuizView } from "../client-only-views";

export const metadata: Metadata = {
  title: "Chord Quiz | Kordi",
  description: "Practice chords with random chord flash cards",
};

export default function Page() {
  return <ChordQuizView />;
}
