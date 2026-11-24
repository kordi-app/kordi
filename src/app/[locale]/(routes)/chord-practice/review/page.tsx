import type { Metadata } from "next";
import { ChordReviewView } from "../../client-only-views";

export const metadata: Metadata = {
  title: "Today's Review | Kordi",
  description: "Practice the chords you missed in the quiz",
};

export default function Page() {
  return <ChordReviewView />;
}
