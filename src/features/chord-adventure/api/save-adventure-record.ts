import { bffClient } from "@/shared/api";
import type { AdventureRecordResult } from "@/entities/chord-adventure";

export function saveAdventureRecord(body: { defeated: number; durationMs: number }): Promise<AdventureRecordResult> {
  return bffClient.post("adventure/records", { json: body }).json<AdventureRecordResult>();
}
