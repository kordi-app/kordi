import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { ScorePracticeView } from "../client-only-views";

export const generateMetadata = localizedMetadata("score", "scoreDescription");

export default function Page() {
  return <ScorePracticeView />;
}
