export type {
  AccessoryId,
  Appearance,
  BodyColor,
  FaceId,
  HatId,
  KordiEmote,
  MyCharacter,
  PetId,
  RewardId,
} from "./model/types";
export {
  ACCESSORY_IDS,
  BODY_COLORS,
  BODY_IDS,
  DEFAULT_APPEARANCE,
  FACE_IDS,
  HAT_IDS,
  PET_IDS,
  REWARD_HATS,
  isRewardHat,
} from "./model/catalog";
export { characterQueries } from "./api/queries";
export { getMyCharacter } from "./api/get-my-character";
// The 3D models (three.js, ~900 KB) are a separate entry, "@/entities/character/three":
// the model files build geometry at module scope, so re-exporting them here would pull
// three.js into every page that only needs the catalog or the queries.
export type { KordiMotion } from "./ui/kordi-model";
