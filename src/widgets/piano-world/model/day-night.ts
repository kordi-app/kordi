/**
 * The island's day follows the viewer's real local clock: morning sky in the
 * morning, stars at night. No server time needed — everyone in the same time
 * zone sees the same sky. Pure colour/intensity maths; the scene applies it.
 */

/** Local hour at which the cycle's phase is 0 → sunrise ≈ 05:30, noon 12:30, sunset ≈ 19:30. */
const PHASE_ZERO_HOUR = 6.5;

/** Fraction of the viewer's local day since midnight (0–1). */
export function localDayFraction(nowMs: number) {
  const d = new Date(nowMs);
  return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000) / 86_400;
}

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

/*
 * Day: a faintly warm sun over a faintly cool sky fill, with a little green
 * bounce from the grass, so shaded sides read cool and lit sides warm.
 * Dawn is rosier and cooler than the amber dusk; night is moonlit blue.
 */
const DAY = { background: "#fcfbf8", sun: "#fff7ec", sky: "#f2f6ff", ground: "#e2e1cc", reflection: "#9fd0ee" };
const DAWN = { background: "#fbe1d9", sun: "#ffc4a6", sky: "#f2d4de", ground: "#cbb0a6", reflection: "#e7b4c0" };
const DUSK = { background: "#ffd9b8", sun: "#ffb27a", sky: "#ffd0a8", ground: "#c9a890", reflection: "#f2b48a" };
const NIGHT = { background: "#0d1330", sun: "#a7b6ff", sky: "#3a4a8a", ground: "#18203a", reflection: "#1c2a55" };

/** The shadow light counts as the sun above this elevation (see skyAt: elevation = sin(2π·phase) + 0.25). */
const DAY_ELEVATION = 0.05;
/** Cycle phases where that happens: from DAY_START, for DAY_LENGTH of the cycle. */
const DAY_START = Math.asin(DAY_ELEVATION - 0.25) / (Math.PI * 2);
const DAY_LENGTH = 0.5 - 2 * DAY_START;

/**
 * The shadow-casting light's direction. The sun crosses from east (+x) to
 * west (−x) on the camera's side of the sky, so shadows fall away up the
 * screen and swing through the day; it's high at noon (short shadows) and
 * low morning and evening (long ones). At night the moon takes over, with
 * the same arc. Never lower than ~22° so shadows stay readable.
 */
function lightDirection(phase: number, elevation: number): [number, number, number] {
  const day = elevation > DAY_ELEVATION;
  // 0 at sunrise/moonrise … 1 at sunset/moonset
  // wrap around midnight of the cycle, so the light never jumps across the sky at dawn or dusk
  const arc = day
    ? ((phase - DAY_START + 1) % 1) / DAY_LENGTH
    : ((phase - DAY_START - DAY_LENGTH + 2) % 1) / (1 - DAY_LENGTH);
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
  const phase = (((localDayFraction(nowMs) - PHASE_ZERO_HOUR / 24) % 1) + 1) % 1;
  // a longer day than night: the sun spends ~60% of the cycle above the horizon
  const elevation = Math.sin(phase * Math.PI * 2) + 0.25;
  const night = 1 - smooth(-0.2, 0.3, elevation);
  // dusk/dawn: strongest when the sun is near the horizon
  const dusk = Math.max(0, 1 - Math.abs(elevation - 0.05) / 0.35);

  // mornings (sun rising) take the dawn palette, evenings the dusk one; blended across noon and midnight
  const morning = smooth(-0.2, 0.2, Math.cos(phase * Math.PI * 2));
  const golden = dusk * (1 - night);

  const tint = (key: keyof typeof DAY) =>
    mix(mix(DAY[key], mix(DUSK[key], DAWN[key], morning), golden), NIGHT[key], night);
  return {
    night,
    elevation,
    azimuth: phase * Math.PI * 2,
    background: tint("background"),
    sunColor: tint("sun"),
    // the low sun is a little softer; the sky fill eases off with it
    sunIntensity: 2.2 - night * 1.55 - golden * 0.2,
    hemiSky: tint("sky"),
    hemiGround: tint("ground"),
    ambient: 1.9 - night * 1.0 - golden * 0.1,
    reflection: tint("reflection"),
    lightDir: lightDirection(phase, elevation),
  };
}
