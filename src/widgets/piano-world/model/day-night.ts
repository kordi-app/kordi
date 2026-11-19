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
  /** what water reflects: blue by day, orange at dusk, deep blue at night */
  reflection: string;
  /** unit vector toward the light that casts shadows (the sun, or the moon at night) */
  lightDir: [number, number, number];
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

const DAY = { background: "#fcfbf8", sun: "#ffffff", sky: "#ffffff", ground: "#e8dfd0", reflection: "#9fd0ee" };
const DUSK = { background: "#ffd9b8", sun: "#ffb27a", sky: "#ffd0a8", ground: "#c9a890", reflection: "#f2b48a" };
const NIGHT = { background: "#0d1330", sun: "#9fb0ff", sky: "#3a4a8a", ground: "#141a30", reflection: "#1c2a55" };

/**
 * The shadow-casting light's direction. The sun crosses from east (+x) to
 * west (−x) on the camera's side of the sky, so shadows fall away up the
 * screen and swing through the day; it's high at noon (short shadows) and
 * low morning and evening (long ones). At night the moon takes over, with
 * the same arc. Never lower than ~22° so shadows stay readable.
 */
function lightDirection(phase: number, elevation: number): [number, number, number] {
  const day = elevation > 0.05;
  // 0 at sunrise/moonrise … 1 at sunset/moonset
  const arc = day ? (phase + 0.04) / 0.58 : (phase - 0.54 + (phase < 0.54 ? 1 : 0)) / 0.42;
  const across = Math.cos(Math.min(1, Math.max(0, arc)) * Math.PI); // +1 east … −1 west
  const height = Math.max(0.38, Math.sin(Math.min(1, Math.max(0, arc)) * Math.PI) * 1.25);
  const x = across * 0.9;
  const y = height;
  const z = 0.55;
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

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
    reflection: tint("reflection"),
    lightDir: lightDirection(phase, elevation),
  };
}
