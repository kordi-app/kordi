import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { ChordQuizView } from "../client-only-views";

export const generateMetadata = localizedMetadata("chordQuiz", "chordQuizDescription");

export default function Page() {
  return <ChordQuizView />;
}
