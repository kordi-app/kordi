import { unwrap, type ApiEnvelope } from "@/shared/api";
import { apiClient } from "@/shared/api/server";
import type { ScoreRecord } from "../model/types";

export function getMyScores(): Promise<ScoreRecord[]> {
  return apiClient
    .get("api/scores/me")
    .json<ApiEnvelope<ScoreRecord[]>>()
    .then(unwrap);
}
