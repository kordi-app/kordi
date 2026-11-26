import type { RefObject } from "react";
import type { VoiceId } from "@/shared/lib/audio";
import type { Appearance, RewardId } from "@/entities/character";
import type { CaveEvent } from "../engine/cave";
import type { DreamEvent } from "../engine/dream-sea";
import type { EmoteId, InteractableId } from "../engine/interactables";
import type { MusicBoxEvent } from "../engine/music-box";
import type { WarpStoneId } from "../engine/island";
import type { RegionId } from "../engine/regions";
import type { SkyEvent } from "../engine/sky-island";
import type { BallState, RemotePlayer } from "../net/protocol";
import type { BallNews } from "../net/use-world-presence";
import type { InteractionScene } from "./hooks/use-interactions";

/*
 * What the page and the 3D world hand each other (see world.tsx): what to show,
 * who else is here, and what happened this frame.
 */

/** Things the world reports back to the page */
export interface WorldEvents {
  /** the key under you changed (null when off the keys or airborne) */
  onStep: (midi: number | null) => void;
  /** a remote player's key changed (or they left: null) */
  onRemoteStep: (id: string, midi: number | null) => void;
  /** course platform under you changed (null = the cloud floor) */
  onPlatform: (index: number | null) => void;
  onPortal: (to: RegionId) => void;
  /** moving ends an emote */
  onEmoteCancel: () => void;
  /** the interactable now in reach */
  onNearby: (id: InteractableId | null) => void;
  /** the key the cat is on, only while it's within earshot */
  onCatStep: (midi: number | null) => void;
  /** a note ball hit or rolled onto a key */
  onBallNote: (midi: number, velocity: number) => void;
  /** the island's terrain made a sound (bridge bar, drum, pipe, harp string, bell…) */
  onVoice: (voice: VoiceId, midi: number, velocity: number, delay?: number) => void;
  /** the warp stone now in reach (island only) */
  onWarpNearby: (id: WarpStoneId | null) => void;
  /** whether you're on the keyboard plaza (the melody game only shows there) */
  onNearKeys: (near: boolean) => void;
  /** the storm temple's dragon roared (an attack is coming) or its fire caught you */
  onDragon: (kind: "roar" | "burn") => void;
  /**
   * You rang the tower bell. `midnight`: it's night here, so it calls the
   * stars (tell the channel); `opened`: the sky was shut and just opened.
   */
  onBell: (midnight: boolean, opened: boolean) => void;
  /** up on the sky island: a star pad, a constellation, or the whole sky */
  onSky: (event: SkyEvent) => void;
  /** in the dream sea: a lost note found, or the whale come down to sing */
  onDream: (event: DreamEvent) => void;
  /** the cat sat down on its secret spot (you can hear it from here) */
  onCatSignal: () => void;
  /** in the cave of sleeping stars: a star rest woken, a fall into the abyss, the necklace taken */
  onCave: (event: CaveEvent) => void;
  /**
   * The dreaming statue opened its eyes: you sat out its dream on the mirror
   * stone. (The trip itself follows a moment later, as an onPortal.)
   */
  onStatueWake: () => void;
  /** inside the music box: a step of its tune, or the whole tune remembered */
  onMusicBox: (event: MusicBoxEvent) => void;
}

export interface WorldPresence {
  remotes: RefObject<Map<string, RemotePlayer>>;
  others: { id: string; name: string }[];
  sendPosition: (
    x: number,
    y: number,
    z: number,
    h: number,
    m: number | null,
    e: EmoteId | null,
  ) => void;
  /** the channel's ball news since the last call, oldest first (the scene takes it every frame) */
  takeBallNews: () => readonly BallNews[];
  /** tell the channel I kicked a ball, or where the one I kicked came to rest (false: not connected) */
  sendBall: (ball: BallState) => boolean;
}

export interface WorldDisplay {
  emote: EmoteId | null;
  /** melody game: the key to step on next */
  target: number | null;
  /** how my Kordi is dressed */
  appearance: Appearance;
  /** reward items I own (a course's treasure no longer shows its crown) */
  rewards: readonly RewardId[];
  interaction: InteractionScene;
  /** bump to fire confetti over Kordi */
  celebrate: number;
  /** warp stones you've woken (island) */
  awake: ReadonlySet<WarpStoneId>;
  /** you've lit the whole sky over the island (its constellation stays up) */
  skyFound: boolean;
  /** you've found the cat's way into the dream sea (its spot shows pawprints) */
  dreamFound: boolean;
  /** the cave's gold necklace is already mine (members: unlocked; guests: kept in this browser) */
  hasNecklace: boolean;
  /**
   * I carry the cosmic crown's light: members wearing it; guests who've earned it
   * (they don't choose a hat: in the cave they wear it, outside their best crown)
   */
  cosmicCrown: boolean;
}
