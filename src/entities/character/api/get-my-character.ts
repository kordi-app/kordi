import { bffClient } from "@/shared/api";
import type { MyCharacter } from "../model/types";

export function getMyCharacter(): Promise<MyCharacter> {
  return bffClient.get("characters/me").json<MyCharacter>();
}
