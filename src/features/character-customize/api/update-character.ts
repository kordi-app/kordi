import { bffClient } from "@/shared/api";
import type { Appearance, MyCharacter } from "@/entities/character";

export function updateCharacter(appearance: Appearance): Promise<MyCharacter> {
  return bffClient.put("characters/me", { json: appearance }).json<MyCharacter>();
}
