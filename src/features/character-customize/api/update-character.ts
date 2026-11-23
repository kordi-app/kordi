import { bffClient, type ApiSchema } from "@/shared/api";
import type { Appearance, MyCharacter } from "@/entities/character";

export function updateCharacter(appearance: Appearance): Promise<MyCharacter> {
  return bffClient.put("characters/me", { json: appearance satisfies ApiSchema<"AppearanceDto"> }).json<MyCharacter>();
}
