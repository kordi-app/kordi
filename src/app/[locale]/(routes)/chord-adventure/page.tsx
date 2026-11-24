import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { ChordAdventureView } from "../client-only-views";

export const generateMetadata = localizedMetadata("chordAdventure", "chordAdventureDescription");

export default function Page() {
  return <ChordAdventureView />;
}
