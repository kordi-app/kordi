import { bffClient } from "@/shared/api";
import type { SaveScoreRequest, ScoreRecord } from "@/entities/chord-quiz";

export function saveScore(request: SaveScoreRequest): Promise<ScoreRecord> {
  return bffClient.post("scores", { json: request }).json<ScoreRecord>();
}
