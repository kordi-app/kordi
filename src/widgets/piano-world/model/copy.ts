import type { ChordCardKey } from "./chord-cards";
import type { EmoteId, InteractableId } from "./interactables";
import type { Melody } from "./melodies";
import type { RegionFeature, RegionId } from "./regions";

/** All user-facing text for the piano world, resolved by the page from i18n. */
export interface PianoWorldCopy {
  // identity
  nameLabel: string;
  nameReroll: string;
  nameAdjectives: string[];
  nameNouns: string[];
  // places
  regions: Record<RegionId, string>;
  features: Record<Exclude<RegionFeature, "melody" | "course">, string>;
  // emotes & interactables
  emotes: Record<EmoteId, string>;
  interact: Record<InteractableId | "jukeboxStop", string>;
  catReactions: string[];
  teacherTips: string[];
  cards: Record<ChordCardKey, string>;
  cardTitle: string;
  cardPlay: string;
  close: string;
  wishTitle: string;
  wishPlaceholder: string;
  wishNote: string;
  wishSend: string;
  wishSent: string;
  jukeboxNowPlaying: string;
  // melody game
  melodies: Record<Melody["key"], string>;
  melodyNext: string;
  melodyHint: string;
  melodyDone: string;
  melodyNextSong: string;
  // hidden course
  courseTitle: string;
  courseHint: string;
  courseBest: string;
  courseDone: string;
  // sound & presence status
  soundOff: string;
  soundLoading: string;
  soundOn: string;
  /** "{channel}" is filled in */
  channel: string;
  /** "{count}" is filled in */
  online: string;
  connecting: string;
  full: string;
  offline: string;
}
