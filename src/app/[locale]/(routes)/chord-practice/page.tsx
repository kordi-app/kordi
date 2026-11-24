import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { ChordPracticeView } from "../client-only-views";

export const generateMetadata = localizedMetadata("chordPractice", "chordPracticeDescription");

export default function Page() {
  return <ChordPracticeView />;
}
