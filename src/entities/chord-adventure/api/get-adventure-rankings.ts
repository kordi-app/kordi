import { publicApiClient, unwrap, type ApiEnvelope } from "@/shared/api";
import type { AdventureRankingEntry } from "../model/types";

/** All-time top runs (public). */
export function getAdventureRankings(): Promise<AdventureRankingEntry[]> {
  return publicApiClient.get("adventure/rankings").json<ApiEnvelope<AdventureRankingEntry[]>>().then(unwrap);
}
