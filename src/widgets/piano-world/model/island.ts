import type { Solid } from "./terrain";

/**
 * The Grand Hall's open island. The keyboard plaza sits in the middle; the
 * rest is walked to, not loaded:
 *
 *   north  — the bell tower: a landmark you can see from anywhere, climbed by
 *            a staircase that winds twice round it, with a bell on the roof
 *   east   — a stream crossed by a xylophone bridge, then the drum valley
 *   west   — the pipe forest: organ pipes that hum as you pass
 *   NW     — the harp waterfall; behind it, a cave with the secret portal
 *
 * Warp stones wake when you first reach them and let you jump between any
 * you've woken. Everything here is data; island-scene.tsx draws it and the
 * physics reads ISLAND_SOLIDS.
 */

/** Walkable area (must stay inside the server's WorldLobby position check). */
export const ISLAND_BOUNDS = { x: 98, zMin: -70, zMax: 40 };

/** Deterministic 0–1 noise, so layouts are stable between renders and players. */
export function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// --- the stream and its xylophone bridge -----------------------------------

export const STREAM = { x: 49, width: 6, zMin: ISLAND_BOUNDS.zMin - 4, zMax: ISLAND_BOUNDS.zMax + 4 };
/** The bridge deck runs along z = 0, this deep */
export const BRIDGE_DEPTH = 3.6;

export interface XyloBar {
  x: number;
  top: number;
  midi: number;
  color: string;
}

const XYLO_NOTES = [72, 74, 76, 77, 79, 81, 83, 84, 86];
const XYLO_COLORS = ["#ff8a8a", "#ffb36b", "#ffd76b", "#b6e36b", "#6bd9a8", "#6bc4ff", "#8a9dff", "#c48aff", "#ff8ad6"];
/** Arched deck: each bar a little higher toward the middle (all within an easy step) */
const XYLO_TOPS = [0.22, 0.32, 0.4, 0.46, 0.5, 0.46, 0.4, 0.32, 0.22];
export const XYLO_BAR_WIDTH = 0.9;

export const XYLO_BARS: readonly XyloBar[] = XYLO_NOTES.map((midi, i) => ({
  x: STREAM.x - 4 + i,
  top: XYLO_TOPS[i],
  midi,
  color: XYLO_COLORS[i],
}));

// --- drum valley -----------------------------------------------------------

export interface Drum {
  x: number;
  z: number;
  r: number;
  top: number;
  midi: number;
  bounce: number;
  color: string;
}

export const DRUMS: readonly Drum[] = [
  { x: 72, z: 0, r: 2.4, top: 0.9, midi: 36, bounce: 1.9, color: "#e2574c" },
  { x: 65, z: -6, r: 1.3, top: 0.6, midi: 45, bounce: 1.35, color: "#f2a541" },
  { x: 65, z: 6.5, r: 1.2, top: 0.55, midi: 47, bounce: 1.35, color: "#4cb5e2" },
  { x: 78.5, z: -7, r: 1.5, top: 0.7, midi: 43, bounce: 1.4, color: "#6fcf73" },
  { x: 79, z: 6, r: 1.4, top: 0.65, midi: 41, bounce: 1.4, color: "#a77de8" },
  { x: 72, z: -11.5, r: 1.0, top: 0.5, midi: 50, bounce: 1.3, color: "#f27ab8" },
  { x: 71, z: 11, r: 1.1, top: 0.5, midi: 48, bounce: 1.3, color: "#f2d541" },
  { x: 86, z: -1, r: 1.8, top: 0.8, midi: 38, bounce: 1.6, color: "#e27a4c" },
  { x: 59.5, z: -4, r: 0.9, top: 0.45, midi: 52, bounce: 1.25, color: "#4ce2c1" },
];

// --- bell tower ------------------------------------------------------------

export const TOWER = { x: 0, z: -46, half: 4, top: 15.4 };
/** Stairs wind round the tower on a square path this far out from its centre */
const STAIR_PATH = TOWER.half + 0.8;
export const STAIR_SIZE = 1.6;
/** Two laps round the tower, arriving mid-way along the left side (between the belfry columns) */
const STAIR_COUNT = 47;
const STAIR_RISE = TOWER.top / STAIR_COUNT;
export const STAIR_THICKNESS = 0.3;
/** The first few steps are open, so you can walk on from the ground */
const OPEN_STEPS = 3;
export const RAIL_HEIGHT = 1.0;

export interface Stair {
  x: number;
  z: number;
  top: number;
  /** outward directions of the step's open edges (one, or two at a corner) */
  outward: { x: number; z: number }[];
}

/** Point at arc length t round the square path (front side first, going right). */
function onSquare(t: number) {
  const side = STAIR_PATH * 2;
  const s = ((t % (side * 4)) + side * 4) % (side * 4);
  const along = s % side;
  switch (Math.floor(s / side)) {
    case 0:
      return { x: -STAIR_PATH + along, z: STAIR_PATH };
    case 1:
      return { x: STAIR_PATH, z: STAIR_PATH - along };
    case 2:
      return { x: STAIR_PATH - along, z: -STAIR_PATH };
    default:
      return { x: -STAIR_PATH, z: -STAIR_PATH + along };
  }
}

export const STAIRS: readonly Stair[] = Array.from({ length: STAIR_COUNT }, (_, k) => {
  const p = onSquare(k * STAIR_SIZE);
  const outward: Stair["outward"] = [];
  if (Math.abs(Math.abs(p.x) - STAIR_PATH) < 1e-6) outward.push({ x: Math.sign(p.x), z: 0 });
  if (Math.abs(Math.abs(p.z) - STAIR_PATH) < 1e-6) outward.push({ x: 0, z: Math.sign(p.z) });
  return { x: TOWER.x + p.x, z: TOWER.z + p.z, top: (k + 1) * STAIR_RISE, outward };
});

/** Handrails along the stairs' outer edges: solid, so the climb is safe. */
export const STAIR_RAILS: readonly { x: number; z: number; w: number; d: number; top: number }[] = STAIRS.slice(
  OPEN_STEPS,
).flatMap((stair) =>
  stair.outward.map((n) => ({
    x: stair.x + n.x * (STAIR_SIZE / 2 - 0.06),
    z: stair.z + n.z * (STAIR_SIZE / 2 - 0.06),
    w: n.x ? 0.12 : STAIR_SIZE,
    d: n.z ? 0.12 : STAIR_SIZE,
    top: stair.top + RAIL_HEIGHT,
  })),
);

/** Belfry columns on the roof (relative to the tower centre) */
export const BELFRY = { inset: 3.2, height: 4.4, spire: 5.5 };
/** Battlements round the roof edge, with a gap where the stairs arrive (the left side) */
export const MERLONS: readonly { x: number; z: number }[] = (() => {
  const edge = TOWER.half - 0.35;
  const along = [-3.4, -1.7, 0, 1.7, 3.4];
  const out: { x: number; z: number }[] = [];
  for (const e of along) {
    out.push({ x: e, z: edge }, { x: e, z: -edge }, { x: edge, z: e });
    if (e < -1 || e > 3) out.push({ x: -edge, z: e }); // the stair landing comes in between
  }
  return out.map((m) => ({ x: TOWER.x + m.x, z: TOWER.z + m.z }));
})();
export const MERLON_SIZE = 0.7;

export const BELL = { x: TOWER.x, z: TOWER.z, y: TOWER.top, radius: 0.85, height: 2.2 };
/** Touch the bell (stand this close on the roof) to ring it */
export const BELL_REACH = 2.0;

// --- pipe forest -----------------------------------------------------------

export interface Pipe {
  x: number;
  z: number;
  r: number;
  height: number;
  midi: number;
}

/** The pipe forest's warp stone (pipes keep clear of it) */
const WARP_PIPES = { x: -40, z: 7 };

const PIPE_NOTES = [48, 50, 52, 55, 57, 60, 62, 64, 67, 69];

export const PIPES: readonly Pipe[] = (() => {
  const pipes: Pipe[] = [];
  let i = 0;
  for (let gx = -38; gx >= -86; gx -= 6.5) {
    for (let gz = -22; gz <= 24; gz += 6.5) {
      i++;
      const x = gx + (hash(i, 1) - 0.5) * 3;
      const z = gz + (hash(i, 2) - 0.5) * 3;
      if (Math.abs(z - 3) < 2.6) continue; // a path runs west through the forest
      if (Math.hypot(x - WARP_PIPES.x, z - WARP_PIPES.z) < 3.5) continue;
      const tall = hash(i, 3);
      const height = 3 + tall * 7;
      // taller pipes sound lower, like an organ's ranks
      const note = PIPE_NOTES[Math.min(PIPE_NOTES.length - 1, Math.floor((1 - tall) * PIPE_NOTES.length))];
      pipes.push({ x, z, r: 0.35 + tall * 0.35, height, midi: note });
    }
  }
  return pipes;
})();
/** Pass this close to a pipe's surface and it hums */
export const PIPE_HUM_REACH = 1.0;

// --- harp waterfall and the cave behind it ----------------------------------

/** The cliff face runs along z = CLIFF.front; the cave opens in it between caveX0..caveX1 */
export const CLIFF = { x0: -84, x1: -42, front: -46, back: -54, top: 12, caveX0: -64, caveX1: -60 };
export const CAVE = { x0: CLIFF.caveX0, x1: CLIFF.caveX1, back: -58 };

export interface HarpString {
  x: number;
  midi: number;
}

const HARP_NOTES = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77];
/** Strings stand in the spray, running front-to-back; walk along the falls to strum them */
export const HARP = { zMin: CLIFF.front + 0.5, zMax: CLIFF.front + 2.9, height: 7 };
export const HARP_STRINGS: readonly HarpString[] = HARP_NOTES.map((midi, i) => ({
  x: CLIFF.caveX0 - 0.7 + i * 0.54,
  midi,
}));

export interface Crystal {
  x: number;
  z: number;
  midi: number;
  color: string;
}

export const CRYSTALS: readonly Crystal[] = [
  { x: CAVE.x0 + 0.7, z: -49.5, midi: 84, color: "#9fe8ff" },
  { x: CAVE.x1 - 0.7, z: -52, midi: 88, color: "#c9a8ff" },
  { x: CAVE.x0 + 0.7, z: -54.5, midi: 91, color: "#a8ffd8" },
];
export const CRYSTAL_REACH = 1.1;

/** The secret portal at the back of the cave (to the cloud course) */
export const CAVE_PORTAL = { x: (CAVE.x0 + CAVE.x1) / 2, z: CAVE.back + 1.4 };

// --- warp stones -----------------------------------------------------------

export type WarpStoneId = "plaza" | "bridge" | "drums" | "tower" | "pipes" | "falls";

export interface WarpStone {
  id: WarpStoneId;
  x: number;
  z: number;
}

export const WARP_STONES: readonly WarpStone[] = [
  { id: "plaza", x: -13, z: 9 },
  { id: "bridge", x: 56.5, z: 5 },
  { id: "drums", x: 80, z: 11 },
  { id: "tower", x: 8, z: -36 },
  { id: "pipes", x: WARP_PIPES.x, z: WARP_PIPES.z },
  { id: "falls", x: -52, z: -37 },
];
/** Walk this close to wake a stone, and to use it */
export const WARP_REACH = 2.6;
/** Where a warp puts you: just in front of the stone */
export const warpArrival = (stone: WarpStone) => ({ x: stone.x, z: stone.z + 2.2 });

// --- set dressing ----------------------------------------------------------

/** Lamp posts along the paths: they light up at night */
export const LAMPS: readonly { x: number; z: number }[] = [
  ...[30, 36, 42].map((x) => ({ x, z: 4.2 })),
  ...[57, 63].map((x) => ({ x, z: -2.6 })),
  ...[-8, -16, -24, -32].map((z) => ({ x: 3.4, z })),
  ...[-31, -48, -60, -74].map((x) => ({ x, z: 0.2 })),
  { x: -46, z: -16 },
  { x: -50, z: -28 },
];

/** Stone paths between the zones (flat strips, purely visual) */
export const PATHS: readonly { x: number; z: number; w: number; d: number }[] = [
  { x: 36, z: 3, w: 18, d: 2.4 }, // plaza → bridge
  { x: 58, z: 0, w: 8, d: 2.4 }, // bridge → drums
  { x: 1.5, z: -21, w: 2.4, d: 33 }, // keyboard → tower
  { x: -55, z: 3, w: 50, d: 2.4 }, // west through the pipe forest
  { x: -48, z: -20, w: 2.4, d: 30 }, // pipe forest → falls
];

// --- solids ----------------------------------------------------------------

const UNCLIMBABLE = 60;

export const ISLAND_SOLIDS: readonly Solid[] = [
  // the stream: an invisible edge on each bank, open only where the bridge crosses
  {
    foot: { shape: "box", x: STREAM.x, z: (STREAM.zMin - BRIDGE_DEPTH / 2) / 2, w: STREAM.width, d: -BRIDGE_DEPTH / 2 - STREAM.zMin },
    top: UNCLIMBABLE,
    bottom: -5,
  },
  {
    foot: { shape: "box", x: STREAM.x, z: (STREAM.zMax + BRIDGE_DEPTH / 2) / 2, w: STREAM.width, d: STREAM.zMax - BRIDGE_DEPTH / 2 },
    top: UNCLIMBABLE,
    bottom: -5,
  },
  ...XYLO_BARS.map(
    (bar, i): Solid => ({
      foot: { shape: "box", x: bar.x, z: 0, w: XYLO_BAR_WIDTH, d: BRIDGE_DEPTH },
      top: bar.top,
      bottom: bar.top - 0.2,
      sound: { voice: "xylophone", midi: bar.midi },
      tag: `xylo:${i}`,
    }),
  ),
  ...DRUMS.map(
    (drum, i): Solid => ({
      foot: { shape: "circle", x: drum.x, z: drum.z, r: drum.r },
      top: drum.top,
      bottom: -1,
      sound: { voice: "drum", midi: drum.midi },
      bounce: drum.bounce,
      tag: `drum:${i}`,
    }),
  ),
  // the tower itself, its stairs, and the bell on the roof
  { foot: { shape: "box", x: TOWER.x, z: TOWER.z, w: TOWER.half * 2, d: TOWER.half * 2 }, top: TOWER.top, bottom: -1 },
  ...STAIRS.map(
    (stair): Solid => ({
      foot: { shape: "box", x: stair.x, z: stair.z, w: STAIR_SIZE, d: STAIR_SIZE },
      top: stair.top,
      bottom: stair.top - STAIR_THICKNESS,
    }),
  ),
  ...STAIR_RAILS.map(
    (rail): Solid => ({ foot: { shape: "box", x: rail.x, z: rail.z, w: rail.w, d: rail.d }, top: rail.top, bottom: rail.top - RAIL_HEIGHT - STAIR_THICKNESS }),
  ),
  ...MERLONS.map(
    (m): Solid => ({ foot: { shape: "box", x: m.x, z: m.z, w: MERLON_SIZE, d: MERLON_SIZE }, top: TOWER.top + 0.8, bottom: TOWER.top - 0.1 }),
  ),
  ...[-1, 1].flatMap((sx) =>
    [-1, 1].map(
      (sz): Solid => ({
        foot: { shape: "circle", x: TOWER.x + sx * BELFRY.inset, z: TOWER.z + sz * BELFRY.inset, r: 0.32 },
        top: TOWER.top + BELFRY.height,
        bottom: TOWER.top - 0.1,
      }),
    ),
  ),
  { foot: { shape: "circle", x: BELL.x, z: BELL.z, r: BELL.radius }, top: BELL.y + BELL.height, bottom: BELL.y },
  ...PIPES.map((pipe): Solid => ({ foot: { shape: "circle", x: pipe.x, z: pipe.z, r: pipe.r }, top: pipe.height, bottom: -1 })),
  // the cliff, split by the cave mouth, and the cave's own walls
  {
    foot: { shape: "box", x: (CLIFF.x0 + CLIFF.caveX0) / 2, z: (CLIFF.front + CLIFF.back) / 2, w: CLIFF.caveX0 - CLIFF.x0, d: CLIFF.front - CLIFF.back },
    top: CLIFF.top,
    bottom: -1,
  },
  {
    foot: { shape: "box", x: (CLIFF.caveX1 + CLIFF.x1) / 2, z: (CLIFF.front + CLIFF.back) / 2, w: CLIFF.x1 - CLIFF.caveX1, d: CLIFF.front - CLIFF.back },
    top: CLIFF.top,
    bottom: -1,
  },
  { foot: { shape: "box", x: CAVE.x0 - 2, z: (CLIFF.back + CAVE.back) / 2 - 1, w: 4, d: CLIFF.back - CAVE.back + 2 }, top: CLIFF.top, bottom: -1 },
  { foot: { shape: "box", x: CAVE.x1 + 2, z: (CLIFF.back + CAVE.back) / 2 - 1, w: 4, d: CLIFF.back - CAVE.back + 2 }, top: CLIFF.top, bottom: -1 },
  { foot: { shape: "box", x: (CAVE.x0 + CAVE.x1) / 2, z: CAVE.back - 1, w: CAVE.x1 - CAVE.x0 + 8, d: 2 }, top: CLIFF.top, bottom: -1 },
  ...CRYSTALS.map((c): Solid => ({ foot: { shape: "circle", x: c.x, z: c.z, r: 0.35 }, top: 1.3, bottom: -1 })),
  // warp stones are solid little monoliths
  ...WARP_STONES.map((w): Solid => ({ foot: { shape: "circle", x: w.x, z: w.z, r: 0.55 }, top: 2.2, bottom: -1 })),
];

/**
 * Live "something was just played" times, written by the simulation and read
 * by the renderer for its little reactions (a drum skin dipping, a pipe
 * glowing, a string shimmering). Keyed by tag, value = clock time.
 */
export const islandHits = new Map<string, number>();
