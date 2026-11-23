import type { Metadata } from "next";
import { ScorePracticeView } from "../client-only-views";

export const metadata: Metadata = {
  title: "Score practice | Kordi",
  description: "Practise a piece from its score, one hand or both",
};

export default function Page() {
  return <ScorePracticeView />;
}
