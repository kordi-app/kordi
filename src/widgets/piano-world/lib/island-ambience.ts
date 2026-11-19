import type { VoiceId } from "@/shared/lib/audio";
import {
  BELL,
  BELL_REACH,
  CRYSTALS,
  CRYSTAL_REACH,
  HARP,
  HARP_STRINGS,
  PIPES,
  PIPE_HUM_REACH,
  WARP_REACH,
  WARP_STONES,
  islandHits,
  zoneAt,
  type WarpStoneId,
} from "../model/island";

/** Re-strike the same pipe / crystal no sooner than this (seconds) */
const HUM_COOLDOWN = 1.4;
const BELL_COOLDOWN = 2.5;
const HARP_COOLDOWN = 0.08;
/** The bell's chord: a low tonic under a bright triad */
const BELL_CHORD = [48, 72, 76, 79];

/** What the island reports as you move through it. */
export interface AmbienceEvents {
  voice: (id: VoiceId, midi: number, velocity: number) => void;
  /** the bell was rung (for a celebration) */
  bell: () => void;
  /** the warp stone in reach changed */
  warpNearby: (id: WarpStoneId | null) => void;
  /** you walked into a different named place */
  zone: (id: WarpStoneId | null) => void;
}

/** Per-player memory between frames. */
export interface Ambience {
  played: Map<string, number>;
  lastX: number;
  warp: WarpStoneId | null;
  zone: WarpStoneId | null;
}

export const createAmbience = (): Ambience => ({ played: new Map(), lastX: 0, warp: null, zone: null });

/** Forget where you were (on arrival somewhere new), reporting the reset. */
export function resetAmbience(a: Ambience, x: number, events: AmbienceEvents) {
  a.lastX = x;
  if (a.warp !== null) {
    a.warp = null;
    events.warpNearby(null);
  }
}

/**
 * One frame of the island's ambient instruments: organ pipes hum as you brush
 * past, harp strings pluck as you cross them, crystals chime, the bell rings
 * when you reach it. Also tracks the warp stone in reach and the place you're in.
 */
export function stepAmbience(
  a: Ambience,
  pos: { x: number; y: number; z: number },
  now: number,
  events: AmbienceEvents,
) {
  /** play `tag` unless it played within `cooldown` seconds */
  const strike = (tag: string, cooldown: number, play: () => void) => {
    if (now - (a.played.get(tag) ?? -Infinity) < cooldown) return;
    a.played.set(tag, now);
    islandHits.set(tag, now);
    play();
  };

  PIPES.forEach((pipe, i) => {
    if (Math.hypot(pos.x - pipe.x, pos.z - pipe.z) - pipe.r < PIPE_HUM_REACH) {
      strike(`pipe:${i}`, HUM_COOLDOWN, () => events.voice("pipe", pipe.midi, 0.6));
    }
  });
  // crossing a string (in the spray, below its top) plucks it
  if (pos.z > HARP.zMin - 0.3 && pos.z < HARP.zMax + 0.3 && pos.y < HARP.height) {
    HARP_STRINGS.forEach((string, i) => {
      if ((a.lastX - string.x) * (pos.x - string.x) < 0) {
        strike(`harp:${i}`, HARP_COOLDOWN, () => events.voice("harp", string.midi, 0.7));
      }
    });
  }
  a.lastX = pos.x;
  CRYSTALS.forEach((crystal, i) => {
    if (Math.hypot(pos.x - crystal.x, pos.z - crystal.z) < CRYSTAL_REACH) {
      strike(`crystal:${i}`, HUM_COOLDOWN, () => events.voice("crystal", crystal.midi, 0.6));
    }
  });
  if (pos.y > BELL.y - 0.5 && Math.hypot(pos.x - BELL.x, pos.z - BELL.z) < BELL_REACH) {
    strike("bell", BELL_COOLDOWN, () => {
      BELL_CHORD.forEach((note, i) => events.voice("bell", note, i === 0 ? 0.9 : 0.55));
      events.bell();
    });
  }

  const stone = WARP_STONES.find((w) => Math.hypot(pos.x - w.x, pos.z - w.z) < WARP_REACH)?.id ?? null;
  if (stone !== a.warp) {
    a.warp = stone;
    events.warpNearby(stone);
  }
  const zone = zoneAt(pos.x, pos.z);
  if (zone !== a.zone) {
    a.zone = zone;
    events.zone(zone);
  }
}
