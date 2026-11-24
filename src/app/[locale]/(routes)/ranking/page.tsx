import { localizedMetadata } from "@/shared/config/i18n/metadata";
import { RankingPage } from "@/views/ranking";

export const generateMetadata = localizedMetadata("ranking");

export default function Page() {
  return <RankingPage />;
}
