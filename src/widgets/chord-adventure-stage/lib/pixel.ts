/**
 * Pixel art from text masks, shaded automatically.
 *
 * A mask is rows of characters, one per pixel ("." is empty). Each letter
 * names a region with a base colour. Baking gives every region a lit edge
 * (top/left, where the light comes from) and a shaded edge (bottom/right),
 * and wraps the whole silhouette in a dark outline — the look that keeps
 * characters readable against busy backgrounds. Regions listed as `flat`
 * (eyes, glints, teeth) keep their exact colour.
 *
 * Baked sprites are cached canvases, drawn with drawImage each frame.
 */

export type Mask = readonly string[];

export interface Ramp {
  base: string;
  light?: string;
  dark?: string;
}

export interface BakeOptions {
  /** region → colour ramp (or one flat colour) */
  colors: Record<string, Ramp | string>;
  /** regions drawn as-is, without light/shadow edges */
  flat?: string;
  /** silhouette outline; null for none */
  outline?: string | null;
}

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** Lighten (amount > 0) or darken (< 0), nudging hue warm in light and cool in shadow. */
export function shade(hex: string, amount: number) {
  const [r, g, b] = toRgb(hex);
  if (amount > 0) return toHex([r + (255 - r) * amount + 6, g + (255 - g) * amount, b + (255 - b) * amount * 0.7]);
  const k = 1 + amount;
  return toHex([r * k * 0.92, g * k * 0.95, b * k + 10 * -amount]);
}

const ramp = (c: Ramp | string): Required<Ramp> => {
  const base = typeof c === "string" ? c : c.base;
  return {
    base,
    light: (typeof c === "string" ? undefined : c.light) ?? shade(base, 0.32),
    dark: (typeof c === "string" ? undefined : c.dark) ?? shade(base, -0.3),
  };
};

const cache = new Map<string, HTMLCanvasElement>();

/** A baked sprite already in the cache, if any. */
export const cached = (key: string) => cache.get(key);

/** Bake a mask into a canvas (1px of outline padding on every side). */
export function bake(mask: Mask, options: BakeOptions, cacheKey?: string): HTMLCanvasElement {
  // the caller's key must identify mask + colours (sprites.ts builds unique ones); no per-frame hashing
  const key = cacheKey;
  const hit = key ? cache.get(key) : undefined;
  if (hit) return hit;

  const h = mask.length;
  const w = Math.max(...mask.map((r) => r.length));
  const at = (x: number, y: number) => (y >= 0 && y < h && x >= 0 && x < (mask[y]?.length ?? 0) ? mask[y][x] : ".");
  const filled = (x: number, y: number) => at(x, y) !== ".";

  const canvas = document.createElement("canvas");
  canvas.width = w + 2;
  canvas.height = h + 2;
  const ctx = canvas.getContext("2d")!;
  const flat = options.flat ?? "";
  const outline = options.outline === undefined ? "#1a1220" : options.outline;

  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      const ch = at(x, y);
      if (ch === ".") {
        // outline: an empty pixel touching the silhouette (4-neighbourhood)
        if (outline && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) {
          ctx.fillStyle = outline;
          ctx.fillRect(x + 1, y + 1, 1, 1);
        }
        continue;
      }
      const spec = options.colors[ch];
      if (!spec) continue;
      let color: string;
      if (flat.includes(ch)) {
        color = typeof spec === "string" ? spec : spec.base;
      } else {
        const r = ramp(spec);
        // edges against a different region or empty space catch light / fall into shadow
        const lit = at(x, y - 1) !== ch || at(x - 1, y) !== ch;
        const shadowed = at(x, y + 1) !== ch || at(x + 1, y) !== ch;
        color = lit && !shadowed ? r.light : shadowed && !lit ? r.dark : r.base;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  if (key) cache.set(key, canvas);
  return canvas;
}

/** 4×4 ordered-dither threshold (0–1), for gradient bands that look hand-pixelled. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const dither = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

/** Deterministic noise. */
export function hash(i: number, salt = 0) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const mod = (a: number, n: number) => ((a % n) + n) % n;
