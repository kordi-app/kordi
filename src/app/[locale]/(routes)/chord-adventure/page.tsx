import type { Metadata } from "next";
import { ChordAdventureView } from "../client-only-views";

export const metadata: Metadata = {
  title: "Chord Adventure | Kordi",
  description: "Beat monsters by playing chords on the piano",
};

export default function Page() {
  return <ChordAdventureView />;
}
