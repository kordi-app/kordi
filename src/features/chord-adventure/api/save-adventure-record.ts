import { bffClient, type ApiSchema } from "@/shared/api";
import type { AdventureRecordResult } from "@/entities/chord-adventure";

/** Start a run: the server notes the time, and later measures the run's length itself. */
export function startAdventureRun(): Promise<{ runId: string }> {
  return bffClient.post("adventure/runs").json<{ runId: string }>();
}

export function saveAdventureRecord(body: ApiSchema<"AdventureRecordRequest">): Promise<AdventureRecordResult> {
  return bffClient.post("adventure/records", { json: body }).json<AdventureRecordResult>();
}
