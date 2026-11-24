import { bffClient, publicApiClient, unwrap, type ApiEnvelope } from "@/shared/api";
import type { RankingEntry, RankingDifficulty, RankingScope } from "../model/types";

/** Quiz best scores. The friends board needs the signed-in user, so it goes through the BFF. */
export function getRankings(
  difficulty: RankingDifficulty,
  scope: RankingScope = "ALL",
): Promise<RankingEntry[]> {
  if (scope === "FRIENDS") {
    return bffClient
      .get("rankings", { searchParams: { difficulty, scope } })
      .json<RankingEntry[]>();
  }
  return publicApiClient
    .get("rankings", { searchParams: { difficulty } })
    .json<ApiEnvelope<RankingEntry[]>>()
    .then(unwrap);
}
