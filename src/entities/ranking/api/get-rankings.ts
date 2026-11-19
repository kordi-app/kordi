import { publicApiClient, unwrap, type ApiEnvelope } from "@/shared/api";
import type { RankingEntry, RankingDifficulty } from "../model/types";

export function getRankings(difficulty: RankingDifficulty): Promise<RankingEntry[]> {
  return publicApiClient
    .get("rankings", { searchParams: { difficulty } })
    .json<ApiEnvelope<RankingEntry[]>>()
    .then(unwrap);
}
