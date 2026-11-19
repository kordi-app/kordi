import type { Metadata } from "next";
import { PianoView } from "../client-only-views";

export const metadata: Metadata = {
  title: "Piano | Kordi",
  description: "Play piano with your keyboard or MIDI device",
};

export default function Page() {
  return <PianoView />;
}
