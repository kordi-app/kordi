import { TOWER } from "./island";
import { terrainGates, type Solid } from "./terrain";

/**
 * The sky island: a secret above the bell tower. Ring the bell at night and
 * it tolls midnight — twelve strokes, and with each one a star comes down to
 * make a step, winding up round the tower to a small island in the sky. Up
 * there, star pads each sound a note; light every star of a constellation and
 * it rings its chord. Light all three (I, IV, V7) and the orrery at the
 * centre plays them as a progression.
 *
 * The bell is shared: the server tells the channel (WorldLobby.ringBell), so
 * whoever is there sees the same stairs and nobody seems to float.
 *
 * Times here are performance.now() seconds (the network handler opens the
 * sky too, outside the render loop). Pure data + state; sky-island.tsx draws it.
 */

/** Strokes of the midnight bell, one star step each */
export const STAR_COUNT = 12;
/** Seconds between strokes (fast, so nobody waits long) */
export const TOLL_GAP = 0.45;
/** The island appears this long after the last stroke */
const ISLAND_DELAY = 0.5;
/** Without the server (solo / offline) a ring keeps the sky open this long — WorldLobby.SKY_OPEN_MS */
export const SKY_OPEN_SECONDS = 10 * 60;
/** The stars flicker for this long before they go */
export const SKY_CLOSING_SECONDS = 20;

/** Gate index of the island itself (the star steps are 0…11) */
export const ISLAND_GATE = STAR_COUNT;

/** Star steps: rise per step (a jump clears 1.28) and the radius they wind round the tower at */
const STAR_RISE = 0.9;
const STAR_PATH = 6.3;
export const STAR_RADIUS = 0.7;
export const STAR_THICKNESS = 0.25;

/**
 * The first star sits off the roof's west edge, south of the tower stairs'
 * last flight (it would otherwise hang over them and catch your head), and the
 * steps wind round the south (towards the camera), east, and up to the north.
 */
const FIRST_ANGLE = Math.atan2(-5.3, 3.3);
const LAST_ANGLE = Math.PI;

export interface StarStep {
  x: number;
  z: number;
  top: number;
}

export const STAR_STEPS: readonly StarStep[] = Array.from({ length: STAR_COUNT }, (_, i) => {
  const angle = FIRST_ANGLE + ((LAST_ANGLE - FIRST_ANGLE) * i) / (STAR_COUNT - 1);
  const radius = i === 0 ? Math.hypot(5.3, 3.3) : STAR_PATH;
  return {
    x: TOWER.x + Math.sin(angle) * radius,
    z: TOWER.z + Math.cos(angle) * radius,
    top: TOWER.top + STAR_RISE * (i + 1),
  };
});

/** The island: north of the tower, so it never hangs between the camera and the climb */
export const SKY_ISLAND = {
  x: TOWER.x,
  z: TOWER.z - 14,
  radius: 7,
  top: STAR_STEPS[STAR_COUNT - 1].top + 0.9,
  thickness: 1,
};

/** The orrery at the island's centre */
export const ORRERY = { x: SKY_ISLAND.x, z: SKY_ISLAND.z, radius: 1, height: 2.6 };

export interface StarPad {
  x: number;
  z: number;
  midi: number;
  /** which constellation it belongs to */
  group: number;
}

export interface Constellation {
  /** roman numeral in C major, for the renderer's label */
  numeral: string;
  /** pad indices, in the order their lines join */
  pads: number[];
}

/** Stand this close to a star pad to light it */
export const PAD_REACH = 0.75;
/** A half-lit constellation goes dark again this long after its last star */
export const PAD_FORGET = 8;

const pad = (dx: number, dz: number, midi: number, group: number): StarPad => ({
  x: SKY_ISLAND.x + dx,
  z: SKY_ISLAND.z + dz,
  midi,
  group,
});

/** I (C E G) east, IV (F A C) west, V7 (G B D F) to the north — the island's back */
export const STAR_PADS: readonly StarPad[] = [
  pad(3.0, 1.5, 60, 0),
  pad(5.0, -0.5, 64, 0),
  pad(3.2, -2.5, 67, 0),
  pad(-3.0, 1.5, 65, 1),
  pad(-5.0, -0.5, 69, 1),
  pad(-3.2, -2.5, 72, 1),
  pad(-1.3, -3.6, 55, 2),
  pad(1.3, -3.6, 59, 2),
  pad(1.3, -5.6, 62, 2),
  pad(-1.3, -5.6, 65, 2),
];

export const CONSTELLATIONS: readonly Constellation[] = [
  { numeral: "I", pads: [0, 1, 2] },
  { numeral: "IV", pads: [3, 4, 5] },
  { numeral: "V7", pads: [6, 7, 8, 9] },
];

/** The progression the orrery plays once every constellation is lit */
export const PROGRESSION: readonly (readonly number[])[] = [
  [48, 60, 64, 67],
  [53, 60, 65, 69],
  [43, 59, 62, 65],
  [48, 60, 64, 67, 72],
];

export const SKY_SOLIDS: readonly Solid[] = [
  ...STAR_STEPS.map(
    (step, i): Solid => ({
      foot: { shape: "circle", x: step.x, z: step.z, r: STAR_RADIUS },
      top: step.top,
      bottom: step.top - STAR_THICKNESS,
      gate: i,
      tag: `star:${i}`,
    }),
  ),
  {
    foot: { shape: "circle", x: SKY_ISLAND.x, z: SKY_ISLAND.z, r: SKY_ISLAND.radius },
    top: SKY_ISLAND.top,
    bottom: SKY_ISLAND.top - SKY_ISLAND.thickness,
    gate: ISLAND_GATE,
  },
  {
    foot: { shape: "circle", x: ORRERY.x, z: ORRERY.z, r: ORRERY.radius },
    top: SKY_ISLAND.top + ORRERY.height,
    bottom: SKY_ISLAND.top - 0.1,
    gate: ISLAND_GATE,
  },
];

// ── state ────────────────────────────────────────────────────────────────────

export const skyRuntime = {
  /** when the bell started tolling (-∞: never) */
  ringAt: -Infinity,
  /** the stars are there until then */
  until: -Infinity,
  /** each pad's light time (-∞: dark) */
  lit: STAR_PADS.map(() => -Infinity),
  /** constellations completed this visit */
  done: CONSTELLATIONS.map(() => false),
  /** when the last constellation was completed (-∞: not yet) */
  finishedAt: -Infinity,
};

export const skyNow = () => performance.now() / 1000;

export const isSkyOpen = (now: number) => now < skyRuntime.until;

/**
 * The bell rang (here, or someone in the channel). If the sky was shut it
 * opens: with `toll`, the stars come down one per stroke from now; without
 * (joining a channel where it's already open) they're simply there. If it was
 * open, only the time left changes. Returns whether it just opened.
 */
export function openSky(now: number, seconds: number, toll: boolean) {
  const opened = !isSkyOpen(now);
  if (opened) {
    resetPuzzle();
    skyRuntime.ringAt = toll ? now : -Infinity;
  }
  skyRuntime.until = Math.max(skyRuntime.until, now + seconds);
  return opened;
}

function resetPuzzle() {
  skyRuntime.lit.fill(-Infinity);
  skyRuntime.done.fill(false);
  skyRuntime.finishedAt = -Infinity;
}

/** How many gates are open: star i after stroke i, the island after the last. */
export function openGates(now: number) {
  if (!isSkyOpen(now)) return 0;
  const since = now - skyRuntime.ringAt;
  if (since >= (STAR_COUNT - 1) * TOLL_GAP + ISLAND_DELAY) return ISLAND_GATE + 1;
  return Math.min(STAR_COUNT, Math.floor(since / TOLL_GAP) + 1);
}

/** When gate i opened (for the renderer's fade-in); -∞ if it was simply there. */
export function gateOpenedAt(i: number) {
  const at = i === ISLAND_GATE ? (STAR_COUNT - 1) * TOLL_GAP + ISLAND_DELAY : i * TOLL_GAP;
  return skyRuntime.ringAt + at;
}

/** 0 while the sky is steady, rising to 1 in the last seconds before it closes. */
export function skyClosing(now: number) {
  if (!isSkyOpen(now)) return 0;
  const left = skyRuntime.until - now;
  return left >= SKY_CLOSING_SECONDS ? 0 : 1 - left / SKY_CLOSING_SECONDS;
}

/** Sync the terrain with the sky (call once a frame on the island). */
export function tickSky(now: number) {
  terrainGates.open = openGates(now);
}

export type SkyEvent =
  | { kind: "pad"; midi: number }
  | { kind: "constellation"; index: number }
  | { kind: "finished" };

/**
 * Light whatever pad you're standing on. Returns what happened this frame:
 * a pad's note, a constellation completing, and the whole sky finishing.
 * Pads of an unfinished constellation go dark again after PAD_FORGET.
 */
export function stepSkyPads(x: number, y: number, z: number, now: number, grounded: boolean): SkyEvent[] {
  const events: SkyEvent[] = [];
  if (terrainGates.open <= ISLAND_GATE || !grounded || Math.abs(y - SKY_ISLAND.top) > 0.3) return events;
  CONSTELLATIONS.forEach((c, group) => {
    if (skyRuntime.done[group]) return;
    const last = Math.max(...c.pads.map((i) => skyRuntime.lit[i]));
    if (now - last > PAD_FORGET) c.pads.forEach((i) => (skyRuntime.lit[i] = -Infinity));
  });
  STAR_PADS.forEach((p, i) => {
    if (skyRuntime.lit[i] > -Infinity || Math.hypot(x - p.x, z - p.z) > PAD_REACH) return;
    skyRuntime.lit[i] = now;
    events.push({ kind: "pad", midi: p.midi });
    const c = CONSTELLATIONS[p.group];
    if (c.pads.every((j) => skyRuntime.lit[j] > -Infinity)) {
      skyRuntime.done[p.group] = true;
      events.push({ kind: "constellation", index: p.group });
      if (skyRuntime.done.every(Boolean)) {
        skyRuntime.finishedAt = now;
        events.push({ kind: "finished" });
      }
    }
  });
  return events;
}
