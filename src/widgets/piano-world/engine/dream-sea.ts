import { buildTerrain, type Solid } from "./terrain";
import { WORLD_CONTRACT } from "./world-contract";

/**
 * The moon-whale's sea: the cat's dream, reached only through a portal no one
 * can see (cat-walk.ts). A sea of stars you walk on, small islands holding
 * dream things — a giant shell, a teacup, a tree growing upside down, a moon
 * lantern — and jellyfish lanterns to hop between them. A whale swims the sky
 * and has lost four notes of its song; each is hidden in one of those things.
 * Bring all four to the summit and it comes down to sing, and a baby whale
 * follows you home.
 *
 * Pure data + state; dream-sea.tsx draws it.
 */

/** The sea you walk on (y = 0) stretches this far */
export const DREAM_BOUNDS = { x: 40, zMin: -46, zMax: 24 };

/** Where you arrive from the island, and the way back beside it */
export const DREAM_ARRIVAL = { x: 0, z: 14 };
export const DREAM_HOME = { x: -3.2, z: 17 };

export type DreamThing = "shell" | "teacup" | "tree" | "moon" | "summit";

export interface DreamIsle {
  thing: DreamThing;
  x: number;
  z: number;
  r: number;
  top: number;
}

/** Each a jump up from the sea or from the jellyfish before it (see dream-sea.test.ts) */
export const ISLES: readonly DreamIsle[] = [
  { thing: "shell", x: 17, z: -4, r: 4, top: 1 },
  { thing: "teacup", x: -17, z: -6, r: 4, top: 1 },
  { thing: "tree", x: -9, z: -22, r: 3.2, top: 2 },
  { thing: "moon", x: 16, z: -21, r: 2.6, top: 4.5 },
  { thing: "summit", x: 2, z: -38, r: 4.5, top: 7.2 },
];

export const isle = (thing: DreamThing) => ISLES.find((i) => i.thing === thing)!;

export interface Jelly {
  x: number;
  z: number;
  top: number;
}

export const JELLY_RADIUS = 0.8;

/**
 * Jellyfish lanterns spaced evenly across the open water between two
 * islands' edges, at the given heights (each a hop up from the last).
 */
function chain(from: DreamThing, to: DreamThing, tops: number[]): Jelly[] {
  const a = isle(from);
  const b = isle(to);
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const ux = (b.x - a.x) / length;
  const uz = (b.z - a.z) / length;
  const span = length - a.r - b.r;
  return tops.map((top, i) => {
    const along = a.r + (span * (i + 1)) / (tops.length + 1);
    return { x: a.x + ux * along, z: a.z + uz * along, top };
  });
}

export const JELLY_CHAINS: readonly (readonly Jelly[])[] = [
  // the teacup's island up to the upside-down tree
  chain("teacup", "tree", [1.3, 1.6, 1.9, 2.2]),
  // the shell's island up to the moon lantern
  chain("shell", "moon", [1.8, 2.6, 3.4, 4.0]),
  // the tree up to the summit
  chain("tree", "summit", [2.9, 3.7, 4.6, 5.5, 6.4]),
];
export const JELLIES: readonly Jelly[] = JELLY_CHAINS.flat();

/** The teacup on its island: a saucer step, then the cup's rim you stand on */
export const TEACUP = { x: -17, z: -6.5, saucer: { r: 2.4, top: 1.85 }, cup: { r: 1.5, top: 2.7 } };

export interface LostNote {
  /** the dream thing it hides in */
  thing: Exclude<DreamThing, "summit">;
  midi: number;
  x: number;
  y: number;
  z: number;
}

/** Reach (body centre to note) to take one */
export const NOTE_REACH = 1.1;

/**
 * Where the four notes hide: one in each dream thing, so finding them takes
 * you round the whole sea and leaves you at the foot of the climb. The
 * shell's lies inside it (a hop up from the sea: the easy first find); the
 * moon's sits in the lantern, up the jellyfish from the shell; the teacup's
 * floats in its steam (climb the cup); and the tree's hangs from a branch
 * (jump for it), where the last jellyfish lead on to the summit.
 */
export const LOST_NOTES: readonly LostNote[] = [
  { thing: "shell", midi: 67, x: isle("shell").x, y: isle("shell").top + 0.9, z: isle("shell").z },
  { thing: "teacup", midi: 72, x: TEACUP.x, y: TEACUP.cup.top + 1.1, z: TEACUP.z },
  { thing: "tree", midi: 74, x: isle("tree").x + 1.2, y: isle("tree").top + 2.3, z: isle("tree").z },
  { thing: "moon", midi: 69, x: isle("moon").x, y: isle("moon").top + 0.9, z: isle("moon").z },
];

/**
 * The whale's song, once it has its notes back: only those four pitches
 * (G A C D). It climbs through them, comes back down, and the low G lifts to
 * C to end: so-do, a close that sounds like coming home.
 */
export const WHALE_SONG: readonly number[] = [67, 69, 72, 74, 72, 69, 67, 72];

/**
 * The server only believes the whale sang for someone who has been in the
 * dream sea this long (WorldSocketHandler.WHALE_MIN_STAY_MS): a member who's
 * quicker than that waits before telling it, so their pet isn't lost.
 */
export const SERVER_MIN_STAY_SECONDS = WORLD_CONTRACT.whale.minStayMs / 1000;

/** Stand this close to the summit's centre, with every note, and the whale comes */
export const SUMMIT_REACH = 2.5;

export const DREAM_SOLIDS: readonly Solid[] = [
  ...ISLES.map((i): Solid => ({ foot: { shape: "circle", x: i.x, z: i.z, r: i.r }, top: i.top, bottom: i.top - 1.2 })),
  ...JELLIES.map((j): Solid => ({ foot: { shape: "circle", x: j.x, z: j.z, r: JELLY_RADIUS }, top: j.top, bottom: j.top - 0.5 })),
  { foot: { shape: "circle", x: TEACUP.x, z: TEACUP.z, r: TEACUP.saucer.r }, top: TEACUP.saucer.top, bottom: 0 },
  { foot: { shape: "circle", x: TEACUP.x, z: TEACUP.z, r: TEACUP.cup.r }, top: TEACUP.cup.top, bottom: 0 },
];

export const DREAM_TERRAIN = buildTerrain(DREAM_SOLIDS);

// ── a visit ──────────────────────────────────────────────────────────────────

export const dreamRuntime = {
  /** notes taken this visit */
  found: LOST_NOTES.map(() => false),
  /** when the whale came down (−∞: not yet) */
  sungAt: -Infinity,
};

export function startDream() {
  dreamRuntime.found.fill(false);
  dreamRuntime.sungAt = -Infinity;
}

export type DreamEvent = { kind: "note"; index: number; midi: number } | { kind: "whale" };

/**
 * Take any note within reach (feet at y) and, holding all four on the
 * summit, call the whale. `now` is any clock that only moves forward.
 */
/** What a quiet frame returns (shared: most frames nothing happens) */
const NO_EVENTS: readonly DreamEvent[] = [];

export function stepDream(x: number, y: number, z: number, now: number): readonly DreamEvent[] {
  let events: DreamEvent[] | null = null;
  LOST_NOTES.forEach((note, i) => {
    if (dreamRuntime.found[i]) return;
    if (Math.hypot(x - note.x, y + 0.95 - note.y, z - note.z) > NOTE_REACH) return;
    dreamRuntime.found[i] = true;
    (events ??= []).push({ kind: "note", index: i, midi: note.midi });
  });
  const summit = isle("summit");
  if (
    dreamRuntime.sungAt === -Infinity &&
    dreamRuntime.found.every(Boolean) &&
    Math.abs(y - summit.top) < 0.3 &&
    Math.hypot(x - summit.x, z - summit.z) < SUMMIT_REACH
  ) {
    dreamRuntime.sungAt = now;
    (events ??= []).push({ kind: "whale" });
  }
  return events ?? NO_EVENTS;
}
