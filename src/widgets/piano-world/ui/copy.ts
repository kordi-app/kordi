import type { LoungeStyle } from "../audio/lounge-band";
import type { ChordCardKey } from "../engine/chord-cards";
import type { EmoteId, InteractableId } from "../engine/interactables";
import type { Melody } from "../engine/melodies";
import type { WarpStoneId } from "../engine/island";
import type { RegionId } from "../engine/regions";

/** All user-facing text for the piano world, resolved by the page from i18n. */
export interface PianoWorldCopy {
  // identity
  nameLabel: string;
  nameReroll: string;
  nameAdjectives: string[];
  nameNouns: string[];
  // places
  regions: Record<RegionId, string>;
  // emotes & interactables
  emotes: Record<EmoteId, string>;
  interact: Record<InteractableId, string>;
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
  /** "{style}" is filled in: what the lounge band switched to */
  jukeboxStyle: string;
  /** the band is silent (sound off): the style is queued for when it plays */
  jukeboxStyleQuiet: string;
  loungeStyles: Record<LoungeStyle, string>;
  // melody game
  melodies: Record<Melody["key"], string>;
  melodyNext: string;
  /** "{jump}" marks the jump control (Space, or the on-screen button on touch) */
  melodyHint: string;
  melodyDone: string;
  melodyNextSong: string;
  // hidden course
  courseTitle: string;
  courseHint: string;
  nightTitle: string;
  courseRankingTitle: string;
  courseRankingEmpty: string;
  /** "{rank}" is replaced */
  courseRankSaved: string;
  courseRankMember: string;
  courseRankGuest: string;
  nightHint: string;
  ruinsTitle: string;
  ruinsHint: string;
  courseBest: string;
  courseDone: string;
  // warp stones
  warpStones: Record<WarpStoneId, string>;
  warpTitle: string;
  warpUse: string;
  /** "{name}" is filled in */
  warpWoke: string;
  warpHere: string;
  // the sky island
  skyOpened: string;
  skyFound: string;
  warpAsleep: string;
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
