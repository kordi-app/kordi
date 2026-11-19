/**
 * The island's day: one cycle every DAY_MS of wall-clock time, so everyone
 * in the world shares the same sky without the server keeping time.
 * Pure colour/intensity maths; the scene applies it each frame.
 */

export const DAY_MS = 8 * 60_000;

export interface Sky {
  /** 0 = full day, 1 = deep night */
  night: number;
  /** sun height: -1 (midnight) … 1 (noon) */
  elevation: number;
  /** sun direction around the island, radians */
  azimuth: number;
  background: string;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  ambient: number;
}

type RGB = [number, number, number];

const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const toHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, t: number) => {
  const x = hex(a);
  const y = hex(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
};
const smooth = (edge0: number, edge1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const DAY = { background: "#fcfbf8", sun: "#ffffff", sky: "#ffffff", ground: "#e8dfd0" };
const DUSK = { background: "#ffd9b8", sun: "#ffb27a", sky: "#ffd0a8", ground: "#c9a890" };
const NIGHT = { background: "#0d1330", sun: "#9fb0ff", sky: "#3a4a8a", ground: "#141a30" };

/** The sky at a given wall-clock time (ms since epoch). */
export function skyAt(nowMs: number): Sky {
  const phase = (nowMs % DAY_MS) / DAY_MS;
  // a longer day than night: the sun spends ~60% of the cycle above the horizon
  const elevation = Math.sin(phase * Math.PI * 2) + 0.25;
  const night = 1 - smooth(-0.2, 0.3, elevation);
  // dusk/dawn: strongest when the sun is near the horizon
  const dusk = Math.max(0, 1 - Math.abs(elevation - 0.05) / 0.35);

  const tint = (key: keyof typeof DAY) => mix(mix(DAY[key], DUSK[key], dusk * (1 - night)), NIGHT[key], night);
  return {
    night,
    elevation,
    azimuth: phase * Math.PI * 2,
    background: tint("background"),
    sunColor: tint("sun"),
    sunIntensity: 2.2 - night * 1.55,
    hemiSky: tint("sky"),
    hemiGround: tint("ground"),
    ambient: 1.9 - night * 1.0,
  };
}
