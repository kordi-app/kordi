import type { AdventureScene } from "@/entities/chord-adventure";
import { bake, cached, type BakeOptions, type Mask } from "./pixel";

/**
 * The cast, as shaded pixel masks (see pixel.ts). Kordi is warm and bright —
 * cream body, red scarf — so it pops off the cool, hazy backgrounds; each
 * monster gets a saturated colour that contrasts with its scene. All original.
 */

// ── Kordi ───────────────────────────────────────────────────────────────
const BODY_TOP: Mask = [
  "......BBBBBB......",
  "....BBBBBBBBBB....",
  "...BBBBBBBBBBBB...",
  "..BBBBBBBBBBBBBB..",
  "..BBBBBBBBBBBBBB..",
];
const EYES_OPEN: Mask = [".BBBBBEHBBBBEHBBB.", ".BBBBBEEBBBBEEBBB."];
const EYES_SHUT: Mask = [".BBBBBBBBBBBBBBBB.", ".BBBBEEEBBBBEEEBB."];
const FACE_REST: Mask = [".BBBPPBBBBBBBBPPB.", ".BBBBBBBBEEBBBBBB.", ".BBBBBBBBBBBBBBBB."];
const FACE_OUCH: Mask = [".BBBPPBBBBBBBBPPB.", ".BBBBBBBEEEEBBBBB.", ".BBBBBBBEEEEBBBBB."];
const BODY_BOTTOM: Mask = [
  ".SSSSSSSSSSSSSSSS.",
  ".SSSSSSSSSSSSSSSS.",
  "ABBBBBBBBBBBBBBBBA",
  "ABBBBBBBBBBBBBBBBA",
  ".BBBBBBBBBBBBBBBB.",
  "..BBBBBBBBBBBBBB..",
  "..BBBBBBBBBBBBBB..",
  "...BBBBBBBBBBBB...",
];
const FEET_STAND: Mask = ["...FFFF....FFFF...", "...FFFF....FFFF..."];
const FEET_STEP_A: Mask = ["....FFFF...FFFF...", "...........FFFF..."];
const FEET_STEP_B: Mask = ["...FFFF...FFFF....", "...FFFF..........."];

const hero = (eyes: Mask, face: Mask, feet: Mask): Mask => [...BODY_TOP, ...eyes, ...face, ...BODY_BOTTOM, ...feet];

export const HERO_FRAMES = {
  idle: hero(EYES_OPEN, FACE_REST, FEET_STAND),
  blink: hero(EYES_SHUT, FACE_REST, FEET_STAND),
  stepA: hero(EYES_OPEN, FACE_REST, FEET_STEP_A),
  stepB: hero(EYES_OPEN, FACE_REST, FEET_STEP_B),
  ouch: hero(EYES_SHUT, FACE_OUCH, FEET_STAND),
} as const;
export type HeroFrame = keyof typeof HERO_FRAMES;
export const HERO_HEIGHT = HERO_FRAMES.idle.length;

/** The scarf's loose end, streaming behind (three flutter frames). */
export const SCARF_FRAMES: Mask[] = [
  ["SSSS", ".SSS", "..SS"],
  [".SSS", "SSSS", "SS.."],
  ["..SS", "SSSS", ".SSS"],
];

/** A conductor's baton with a star on the tip — the chord comes out of it. */
export const BATON: Mask = ["...Y.", "..YYY", "...W.", "..W..", ".W...", "W...."];

const HERO_COLORS: BakeOptions = {
  colors: {
    B: { base: "#f8efe0", light: "#fffaf0", dark: "#dcc9b0" },
    A: { base: "#f1e5d2", light: "#fff6e6", dark: "#cdb89c" },
    E: "#2a1c22",
    H: "#ffffff",
    P: "#ff9fa0",
    F: { base: "#c08a52", light: "#dcaa70", dark: "#8c5e34" },
    S: { base: "#e8434b", light: "#ff7a6e", dark: "#a8233a" },
    Y: "#ffd75a",
    W: { base: "#8b5a3c", light: "#a87452", dark: "#5e3a26" },
  },
  flat: "EHPY",
  outline: "#241826",
};

export const heroSprite = (frame: HeroFrame) => bake(HERO_FRAMES[frame], HERO_COLORS, `hero-${frame}`);
export const scarfSprite = (i: number) => bake(SCARF_FRAMES[i % SCARF_FRAMES.length], HERO_COLORS, `scarf-${i % 3}`);
export const batonSprite = () => bake(BATON, HERO_COLORS, "baton");

/** An eighth note, the chord's projectile. */
export const NOTE: Mask = ["...NN", "...NNN", "...N.N", "...N..", "NNNN..", "NNNN..", ".NN..."];
export const noteSprite = (color: string) =>
  bake(NOTE, { colors: { N: color }, flat: "N", outline: "#241826" }, `note-${color}`);

// ── monsters ────────────────────────────────────────────────────────────
const SLIME: Mask = [
  "..........MMMM..........",
  ".......MMMMMMMMMM.......",
  ".....MMMMMMMMMMMMMM.....",
  "....MMGGMMMMMMMMMMMM....",
  "...MMGGMMMMMMMMMMMMMM...",
  "..MMMGMMMMMMMMMMMMMMMM..",
  "..MMMMEEEMMMMMMEEEMMMM..",
  ".MMMMMEEKMMMMMMEEKMMMMM.",
  ".MMMMMEKKMMMMMMEKKMMMMM.",
  ".MMMMMMMMDDDDDDMMMMMMMM.",
  "MMMMMMMMMMDDDDMMMMMMMMMM",
  "MMMMMMMMMMMMMMMMMMMMMMMM",
  "MMMMMMMMMMMMMMMMMMMMMMMM",
  ".MMMMMMMMMMMMMMMMMMMMMM.",
  "..MMMMMMMMMMMMMMMMMMMM..",
];
const SHROOM: Mask = [
  "......CCCCCCCCCC......",
  "....CCCCSSCCCCCCCC....",
  "...CCCCSSSSCCCCSSCC...",
  "..CCCCCCSSCCCCSSSSCC..",
  ".CCSSCCCCCCCCCCCSSCCC.",
  ".CSSSSCCCCCCSSCCCCCCC.",
  "CCCSSCCCCCCSSSSCCCCCCC",
  "CCCCCCCCCCCCSSCCCCCCCC",
  ".CCCCCCCCCCCCCCCCCCCC.",
  "....TTTTTTTTTTTTTT....",
  "....TTTEETTTTEETTT....",
  "....TTTEKTTTTEKTTT....",
  "....TTTTTTTTTTTTTT....",
  "....TTTTTDDDDTTTTT....",
  "....TTTTTTTTTTTTTT....",
  ".....TTTTTTTTTTTT.....",
  "....TT..........TT....",
];
const BAT_UP: Mask = [
  "WW....................WW",
  "WWW..................WWW",
  "WWWW......BBBB......WWWW",
  ".WWWW....BBBBBB....WWWW.",
  "..WWWWW.BBBBBBBB.WWWWW..",
  "...WWWWWBBEBBEBBWWWWW...",
  "....WWWWBBBBBBBBWWWW....",
  ".....WW.BBFBBFBB.WW.....",
  "........BBBBBBBB........",
  ".........BBBBBB.........",
  "..........BBBB..........",
];
const BAT_DOWN: Mask = [
  "........................",
  "..........BBBB..........",
  ".........BBBBBB.........",
  "........BBBBBBBB........",
  "......WWBBEBBEBBWW......",
  "...WWWWWBBBBBBBBWWWWW...",
  ".WWWWWWWBBFBBFBBWWWWWWW.",
  "WWWWWW..BBBBBBBB..WWWWWW",
  "WWWW.....BBBBBB.....WWWW",
  "WW........BBBB........WW",
  "........................",
];
const KNIGHT: Mask = [
  "........PPP.........",
  ".......PPPPP........",
  "......HHHHHHHH......",
  ".....HHHHHHHHHH.....",
  ".....HVVVVVVVVH.....",
  ".....HVEEVVEEVH.....",
  ".....HVVVVVVVVH.....",
  ".....HHHHHHHHHH.....",
  "...AAAAAAAAAAAAAA...",
  "..AAAAAAAAAAAAAAAA..",
  "SSSSAAAAAAAAAAAAAAA.",
  "SSSSSAAAAGGGGAAAAAA.",
  "SSSSSAAAAGGGGAAAAAA.",
  "SSSSSAAAAAAAAAAAAAA.",
  ".SSSSAAAAAAAAAAAAA..",
  "..SS.AAAAAAAAAAAA...",
  ".....LLLL....LLLL...",
  ".....LLLL....LLLL...",
  "....LLLLL....LLLLL..",
];
const IMP: Mask = [
  "......F...F...F.......",
  ".....FF..FFF..FF......",
  "....FFFFFFFFFFFFF.....",
  "..H.RRRRRRRRRRRRR.H...",
  "..HHRRRRRRRRRRRRRHH...",
  "...RRRRRRRRRRRRRRR....",
  "...RRREEERRRREEERR....",
  "...RRREKERRRREKERR....",
  "...RRRRRRRRRRRRRRR....",
  "...RRRRWRWRWRWRRRR....",
  "....RRRRRRRRRRRRR.....",
  "..RRRRRRRRRRRRRRRRR...",
  ".RR.RRRRRRRRRRRRR.RR..",
  ".R...RRRRRRRRRRR...R..",
  ".....RRRR...RRRR......",
  ".....RRR.....RRR......",
];

interface MonsterDef {
  frames: Mask[];
  colors: BakeOptions["colors"];
  flat: string;
  /** the region that glows red as the monster closes in */
  eye: string;
}

export const MONSTERS: Record<AdventureScene, MonsterDef> = {
  meadow: {
    frames: [SLIME],
    colors: { M: { base: "#ff7eb6", light: "#ffb3d4", dark: "#c94f86" }, G: "#ffe3f0", D: "#7a2350", E: "#ffffff", K: "#2a1220" },
    flat: "GDEK",
    eye: "E",
  },
  forest: {
    frames: [SHROOM],
    colors: {
      C: { base: "#ff8a3d", light: "#ffb36e", dark: "#c45a1f" },
      S: "#fff3d6",
      T: { base: "#f3dcc0", light: "#fff0dc", dark: "#c9ab88" },
      D: "#5a2a24",
      E: "#ffffff",
      K: "#24140e",
    },
    flat: "SDEK",
    eye: "E",
  },
  cave: {
    frames: [BAT_UP, BAT_DOWN],
    colors: { W: { base: "#7b3fb8", light: "#a46ae0", dark: "#4f2380" }, B: { base: "#a05ad6", light: "#c58cf0", dark: "#6c38a0" }, E: "#ffd75a", F: "#ffffff" },
    flat: "EF",
    eye: "E",
  },
  castle: {
    frames: [KNIGHT],
    colors: {
      H: { base: "#9aa3b8", light: "#cdd4e4", dark: "#666e86" },
      A: { base: "#8a93aa", light: "#bcc4d8", dark: "#5b6380" },
      V: "#1b1726",
      E: "#ff4d4d",
      P: { base: "#4fc3ff", light: "#9be0ff", dark: "#2a86c4" },
      G: "#ffd75a",
      S: { base: "#3d6fb0", light: "#6a98d6", dark: "#27497a" },
      L: { base: "#6b7286", light: "#9198ac", dark: "#474d5e" },
    },
    flat: "VEG",
    eye: "E",
  },
  volcano: {
    frames: [IMP],
    colors: {
      R: { base: "#ff5a36", light: "#ff8f66", dark: "#b8331c" },
      F: "#ffd23f",
      H: { base: "#f7f0e0", light: "#ffffff", dark: "#c9bfa8" },
      E: "#fff36b",
      K: "#2a0a08",
      W: "#ffffff",
    },
    flat: "FEKW",
    eye: "E",
  },
};

/** A monster frame, baked; `angry` swaps its eyes to a glowing red (it's close). */
export function monsterSprite(scene: AdventureScene, frame: number, angry: boolean, flash = false) {
  const def = MONSTERS[scene];
  const key = `m-${scene}-${frame % def.frames.length}-${angry}-${flash}`;
  const hit = cached(key);
  if (hit) return hit;
  const mask = def.frames[frame % def.frames.length];
  const colors = flash
    ? Object.fromEntries(Object.keys(def.colors).map((k) => [k, "#ffffff"]))
    : angry
      ? { ...def.colors, [def.eye]: "#ff3b3b" }
      : def.colors;
  return bake(mask, { colors, flat: flash ? Object.keys(def.colors).join("") : def.flat, outline: flash ? "#ffffff" : "#1a1220" }, key);
}

export const monsterFrameCount = (scene: AdventureScene) => MONSTERS[scene].frames.length;
