import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { PianoView } from "../client-only-views";

export const generateMetadata = localizedMetadata("piano", "pianoDescription");

export default function Page() {
  return <PianoView />;
}
