import { CLIFF } from "./island";
import { buildTerrain, type Solid } from "./terrain";
import { WORLD_CONTRACT } from "./world-contract";

/**
 * The cave of sleeping stars: behind an illusory stretch of the island's cliff
 * (next to nothing there to see — walk into the right spot of rock and you're through),
 * a cave so dark you can barely see your own feet. Wear the cosmic crown (the
 * night course's reward) and its starlight fills the place: the stars asleep in
 * the walls wake as you pass. Inside: a hall of fallen pillars, a chasm crossed
 * on a broken bridge, a star rest on its far side (touch it and a fall brings
 * you back there, not to the way in), and at the end a stepped dais where a
 * gold necklace floats — only in the crown's light can you see it, or take it.
 *
 * Pure data + state; cave.tsx draws it.
 */

/** One map cell is this many units square */
export const CAVE_CELL = 2;

/**
 * The cave, north at the top (row r is at z = CAVE_Z0 + r × CELL, column c at
 * x = (c − 10) × CELL):
 *
 * - `#` rock    - `.` floor   - ` ` the abyss (no floor: fall and you're
 *   brought back to the star rest if you've woken it, or to where you came in)
 * - `P` a fallen pillar to hop (standing on it is fine)
 * - `S` a stalagmite (too tall to climb)
 * - `1`–`3` a mound of rubble, 0.3 a step (walkable)
 * - `R` the star rest   - `A` the altar   - `E` the way out
 */
const MAP = [
  "#####################", // 0
  "######.........######",
  "####.............####",
  "###..S.........S..###",
  "###...............###",
  "###.......A.......###", // 5: the altar
  "###...............###",
  "###..S.........S..###",
  "####.............####",
  "######.........######",
  "########.....########", // 10
  "#########...#########",
  "#########.R.#########", // 12: the star rest past the chasm
  "####      .      ####",
  "####      ...    ####",
  "####        .    ####", // 15
  "####             ####", // 16: the bridge's broken span — jump it
  "####        .    ####",
  "####    .....    ####",
  "####    .        ####",
  "########.############", // 20
  "###.......P.......###",
  "###..S.........S..###",
  "###.....P...P.....###",
  "###..123321.......###",
  "###...............###", // 25
  "###.P...S...S...P.###",
  "####.............####",
  "######.........######",
  "########.....########",
  "#########...#########", // 30
  "#########...#########",
  "########.....########",
  "#######.......#######",
  "#######.......#######",
  "#######...E...#######", // 35: the way out
  "#####################",
];

export const CAVE_Z0 = -62;
export const CAVE_ROWS = MAP.length;
export const CAVE_COLS = MAP[0].length;

export const cellX = (c: number) => (c - (CAVE_COLS - 1) / 2) * CAVE_CELL;
export const cellZ = (r: number) => CAVE_Z0 + r * CAVE_CELL;

/** What a map cell holds */
export const caveCell = (r: number, c: number) => MAP[r]?.[c] ?? "#";

function find(mark: string): { r: number; c: number }[] {
  const found: { r: number; c: number }[] = [];
  MAP.forEach((row, r) => [...row].forEach((ch, c) => ch === mark && found.push({ r, c })));
  return found;
}

const at = ({ r, c }: { r: number; c: number }) => ({ x: cellX(c), z: cellZ(r) });

/** The walls' outer edge; you never get near it (rock all round) */
export const CAVE_BOUNDS = {
  x: ((CAVE_COLS - 1) / 2) * CAVE_CELL + CAVE_CELL / 2,
  zMin: CAVE_Z0 - CAVE_CELL / 2,
  zMax: cellZ(CAVE_ROWS - 1) + CAVE_CELL / 2,
};

/** The way out (back to the cliff: the cave's mouth, in its south wall) and where you arrive, a few steps in front of it */
export const CAVE_EXIT = at(find("E")[0]);
export const CAVE_ARRIVAL = { x: CAVE_EXIT.x, z: CAVE_EXIT.z - 4 };

/**
 * The illusory wall on the island: a stretch of the cliff west of the harp
 * waterfall you can walk into. All that marks it is a crack in the rock like
 * the cliff's others, but for coming down to the ground (harp-falls.tsx) —
 * unless you wear the cosmic crown, whose light makes the rock shimmer when
 * you're close.
 */
export const ILLUSORY_WALL = { x: -75, z: CLIFF.front + 0.55, width: 2.4 };
/** Coming back out, you stand in front of it */
export const ILLUSORY_ARRIVAL = { x: ILLUSORY_WALL.x, z: CLIFF.front + 3 };
/** The crown makes the wall shimmer from this far */
export const ILLUSORY_REVEAL = 7;

/** The altar: a stepped dais round it, the necklace floating over its pedestal */
export const ALTAR = { ...at(find("A")[0]), pedestal: 0.55, pedestalTop: 2.1 };
/** The dais: square steps round the altar, each `rise` higher and narrower */
export const DAIS_STEPS = [
  { half: 4.5, top: 0.3 },
  { half: 3.5, top: 0.6 },
  { half: 2.5, top: 0.9 },
  { half: 1.5, top: 1.2 },
];
export const DAIS_TOP = DAIS_STEPS[DAIS_STEPS.length - 1].top;
/** Close enough to the pedestal (on the dais top) to take the necklace */
export const ALTAR_REACH = 1.6;
/** The necklace floats here, over the pedestal */
export const NECKLACE_SPOT = { x: ALTAR.x, y: ALTAR.pedestalTop + 0.55, z: ALTAR.z };

/**
 * Star rests: touch one to wake it; a fall into the abyss brings you back to
 * the last one woken. There is one, past the chasm: before it, a fall costs
 * only the walk back from the way in. (The server's contract still lists a
 * second by the entrance, from when there was one: it lights it as you walk
 * over the spot, and nothing ever comes back there.)
 */
export const STAR_RESTS: readonly { x: number; z: number }[] = find("R").map(at);
export const REST_REACH = 1.6;

/** Below this you've fallen into the abyss for good */
export const ABYSS_FLOOR = -14;
export const ABYSS_CATCH = -5;

/** The server only believes the necklace was taken after this long in the cave (WorldSocketHandler.CAVE_MIN_STAY_MS) */
export const CAVE_SERVER_MIN_STAY_SECONDS = WORLD_CONTRACT.cave.minStayMs / 1000;

/** How tall the rock walls stand */
export const WALL_TOP = 6;
const PILLAR = { r: 0.75, top: 1.0 };
const STALAGMITE = { r: 0.45, top: 2.6 };
const RUBBLE_RISE = 0.3;

export interface CaveFeature {
  kind: "pillar" | "stalagmite";
  x: number;
  z: number;
}

export const CAVE_FEATURES: readonly CaveFeature[] = [
  ...find("P").map((cell) => ({ kind: "pillar" as const, ...at(cell) })),
  ...find("S").map((cell) => ({ kind: "stalagmite" as const, ...at(cell) })),
];

/** Rock cells that face open cave (the only ones worth drawing) */
export const WALL_FACES: readonly { x: number; z: number; r: number; c: number }[] = (() => {
  const faces: { x: number; z: number; r: number; c: number }[] = [];
  for (let r = 0; r < CAVE_ROWS; r++) {
    for (let c = 0; c < CAVE_COLS; c++) {
      if (caveCell(r, c) !== "#") continue;
      const open = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ].some(([rr, cc]) => rr >= 0 && rr < CAVE_ROWS && cc >= 0 && cc < CAVE_COLS && caveCell(rr, cc) !== "#");
      if (open) faces.push({ x: cellX(c), z: cellZ(r), r, c });
    }
  }
  return faces;
})();

/** Floor cells (everything that isn't rock or abyss), with their height */
export const FLOOR_CELLS: readonly { x: number; z: number; top: number }[] = (() => {
  const cells: { x: number; z: number; top: number }[] = [];
  MAP.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === "#" || ch === " ") return;
      const rubble = Number(ch);
      cells.push({ x: cellX(c), z: cellZ(r), top: Number.isInteger(rubble) && rubble > 0 ? rubble * RUBBLE_RISE : 0 });
    }),
  );
  return cells;
})();

const box = (x: number, z: number, w: number, d: number, top: number, bottom = -1): Solid => ({
  foot: { shape: "box", x, z, w, d },
  top,
  bottom,
});

export const CAVE_SOLIDS: readonly Solid[] = [
  // the floor itself: there's none over the abyss
  ...FLOOR_CELLS.map((cell) => box(cell.x, cell.z, CAVE_CELL, CAVE_CELL, cell.top)),
  // rock: only the cells beside open cave can ever be reached
  ...WALL_FACES.map((cell) => box(cell.x, cell.z, CAVE_CELL, CAVE_CELL, WALL_TOP)),
  ...CAVE_FEATURES.map(
    (f): Solid => ({
      foot: { shape: "circle", x: f.x, z: f.z, r: f.kind === "pillar" ? PILLAR.r : STALAGMITE.r },
      top: f.kind === "pillar" ? PILLAR.top : STALAGMITE.top,
      bottom: -1,
    }),
  ),
  ...DAIS_STEPS.map((step) => box(ALTAR.x, ALTAR.z, step.half * 2, step.half * 2, step.top)),
  // the pedestal: too tall to stand on, you reach up to it
  { foot: { shape: "circle", x: ALTAR.x, z: ALTAR.z, r: ALTAR.pedestal }, top: ALTAR.pedestalTop, bottom: -1 },
];

export const CAVE_TERRAIN = buildTerrain(CAVE_SOLIDS);

// --- state -------------------------------------------------------------------

/** What this visit to the cave has woken, shared between the frame loop and the HUD */
export const caveRuntime = {
  /** star rests woken this visit (index into STAR_RESTS) */
  rests: STAR_RESTS.map(() => false),
  /** the rest you'd come back to after a fall (-1: none yet, so where you came in) */
  lastRest: -1,
  /** the necklace was taken this visit */
  taken: false,
};

export function startCave() {
  caveRuntime.rests = STAR_RESTS.map(() => false);
  caveRuntime.lastRest = -1;
  caveRuntime.taken = false;
}

export type CaveEvent =
  | { kind: "rest"; index: number }
  | { kind: "fell"; to: { x: number; z: number } }
  | { kind: "necklace" };

export interface CaveStep {
  grounded: boolean;
  /** wearing the cosmic crown: the necklace is only there in its light */
  crowned: boolean;
  /** already yours: nothing left on the altar */
  hasNecklace: boolean;
  /** seconds since you came in (the server won't believe a take sooner than CAVE_SERVER_MIN_STAY_SECONDS) */
  stayed: number;
}

/** A take this soon after coming in waits (with the margin the server's clock may need) */
export const NECKLACE_READY_SECONDS = CAVE_SERVER_MIN_STAY_SECONDS + 1.5;

/**
 * One frame in the cave: wake a star rest you've reached, bring you back from
 * the abyss, and hand you the necklace — only in the crown's light, standing
 * on the dais top beside the pedestal, once you've been here long enough for
 * the server to believe it, and only once.
 */
/** What a quiet frame returns (shared: most frames nothing happens) */
const NO_EVENTS: readonly CaveEvent[] = [];

export function stepCave(x: number, y: number, z: number, step: CaveStep): readonly CaveEvent[] {
  const { grounded, crowned, hasNecklace, stayed } = step;
  let events: CaveEvent[] | null = null;
  for (let i = 0; grounded && i < STAR_RESTS.length; i++) {
    const rest = STAR_RESTS[i];
    if (Math.hypot(x - rest.x, z - rest.z) > REST_REACH) continue;
    caveRuntime.lastRest = i;
    if (!caveRuntime.rests[i]) {
      caveRuntime.rests[i] = true;
      (events ??= []).push({ kind: "rest", index: i });
    }
  }
  if (y < ABYSS_CATCH) {
    const rest = caveRuntime.lastRest >= 0 ? STAR_RESTS[caveRuntime.lastRest] : null;
    // just in front of the rest (on it you'd stand in its glow); with none woken, back where you came in
    (events ??= []).push({ kind: "fell", to: rest ? { x: rest.x, z: rest.z + 1.2 } : { ...CAVE_ARRIVAL } });
  }
  if (
    crowned &&
    !hasNecklace &&
    stayed >= NECKLACE_READY_SECONDS &&
    !caveRuntime.taken &&
    grounded &&
    y >= DAIS_TOP - 0.15 &&
    Math.hypot(x - ALTAR.x, z - ALTAR.z) <= ALTAR_REACH + ALTAR.pedestal
  ) {
    caveRuntime.taken = true;
    (events ??= []).push({ kind: "necklace" });
  }
  return events ?? NO_EVENTS;
}
