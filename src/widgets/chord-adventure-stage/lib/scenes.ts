import type { AdventureScene } from "@/entities/chord-adventure";
import { dither, hash, mod } from "./pixel";

/** Logical resolution: drawn at this size, scaled up with crisp pixels. */
export const W = 288;
export const H = 144;
export const GROUND_Y = 112;
/** Layers are baked this wide and tile horizontally. */
const TILE_W = W * 2;

/**
 * Backgrounds: cool, low-contrast layers that fade into the sky the further
 * away they are (atmospheric perspective), so the warm, outlined characters
 * stand out. Each scene's layers are baked once and scroll at their own speed.
 */
interface SceneDef {
  /** sky colours top → horizon */
  sky: string[];
  /** far → near */
  layers: { color: string; speed: number; draw: (ctx: CanvasRenderingContext2D, color: string) => void }[];
  ground: { top: string; edge: string; fill: string; detail: string; deep: string };
  /** darkness laid over everything before the characters (0–1) */
  ambient: number;
  /** tint of the darkness, and the colour of lights in this scene */
  dark: string;
  particle: { color: string; count: number; kind: "petal" | "firefly" | "dust" | "star" | "ember" };
}

// ── shape helpers (all drawn across TILE_W so they tile) ────────────────
function ridge(ctx: CanvasRenderingContext2D, color: string, base: number, amp: number, seed: number, roughness = 1) {
  ctx.fillStyle = color;
  for (let x = 0; x < TILE_W; x++) {
    const a = (x / TILE_W) * Math.PI * 2;
    const y =
      base -
      amp *
        (0.55 * Math.sin(a * 2 + seed) + 0.3 * Math.sin(a * 5 + seed * 2) * roughness + 0.15 * Math.sin(a * 11 + seed * 3) * roughness + 0.6);
    ctx.fillRect(x, Math.round(y), 1, H - Math.round(y));
  }
}

function snowcaps(ctx: CanvasRenderingContext2D, color: string, base: number, amp: number, seed: number) {
  ctx.fillStyle = color;
  for (let x = 0; x < TILE_W; x++) {
    const a = (x / TILE_W) * Math.PI * 2;
    const y = base - amp * (0.55 * Math.sin(a * 2 + seed) + 0.3 * Math.sin(a * 5 + seed * 2) + 0.15 * Math.sin(a * 11 + seed * 3) + 0.6);
    if (y < base - amp * 0.75) ctx.fillRect(x, Math.round(y), 1, Math.round(base - amp * 0.75 - y) + 1);
  }
}

function pines(ctx: CanvasRenderingContext2D, color: string, baseY: number, count: number, minH: number, maxH: number, seed: number) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const x = Math.floor(((i + hash(i, seed) * 0.6) / count) * TILE_W);
    const h = Math.round(minH + hash(i, seed + 1) * (maxH - minH));
    const top = baseY - h;
    for (let y = 0; y < h; y++) {
      // jagged tiers, like branches
      const tier = (y % 5) / 5;
      const half = Math.max(1, Math.round((y / h) * (h * 0.32) * (0.75 + tier * 0.35)));
      ctx.fillRect(x - half, top + y, half * 2 + 1, 1);
    }
    ctx.fillRect(x, baseY, 1, H - baseY);
  }
}

function stalactites(ctx: CanvasRenderingContext2D, color: string, count: number, maxLen: number, seed: number) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TILE_W, 6);
  for (let i = 0; i < count; i++) {
    const x = Math.floor((i / count) * TILE_W + hash(i, seed) * 10);
    const len = Math.round(6 + hash(i, seed + 1) * maxLen);
    const width = 3 + Math.round(hash(i, seed + 2) * 5);
    for (let y = 0; y < len; y++) {
      const w = Math.max(1, Math.round(width * (1 - y / len)));
      ctx.fillRect(x - Math.floor(w / 2), 6 + y, w, 1);
    }
  }
}

function crystals(ctx: CanvasRenderingContext2D, colors: string[], baseY: number, count: number, seed: number) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor((i / count) * TILE_W + hash(i, seed) * 30);
    const h = 6 + Math.round(hash(i, seed + 1) * 12);
    ctx.fillStyle = colors[i % colors.length];
    for (let y = 0; y < h; y++) {
      const w = y < 2 ? 1 : y < 4 ? 2 : 3;
      ctx.fillRect(x - Math.floor(w / 2), baseY - h + y, w, 1);
    }
  }
}

function castleSkyline(ctx: CanvasRenderingContext2D, color: string, baseY: number) {
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const x0 = i * (TILE_W / 4) + 20;
    // keep: a wide hall with a tall tower each side
    ctx.fillRect(x0, baseY - 22, 70, 22 + (H - baseY));
    for (let b = 0; b < 70; b += 6) ctx.fillRect(x0 + b, baseY - 25, 3, 3);
    for (const tx of [x0 - 6, x0 + 66]) {
      ctx.fillRect(tx, baseY - 46, 10, 46);
      for (let y = 0; y < 8; y++) ctx.fillRect(tx + 5 - Math.floor(y / 1.6), baseY - 54 + y, Math.floor(y / 1.6) * 2 + 1, 1);
    }
  }
}

function arches(ctx: CanvasRenderingContext2D, color: string, baseY: number) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TILE_W, 10);
  for (let x = 0; x < TILE_W; x += 72) {
    ctx.fillRect(x, 0, 12, baseY);
    ctx.fillRect(x - 2, baseY - 4, 16, 4);
    // the arch curve between pillars
    // the arch between pillars: fill the corners above a half-ellipse
    const depth = 30;
    for (let i = 0; i < 60; i++) {
      const curve = Math.sqrt(Math.max(0, 900 - (i - 29.5) ** 2)) / 30; // 0 at the pillars … 1 in the middle
      const bottom = 10 + Math.round(depth * (1 - curve));
      ctx.fillRect(x + 12 + i, 10, 1, bottom - 10 + 1);
    }
  }
}

function volcanoPeak(ctx: CanvasRenderingContext2D, color: string, glow: string, baseY: number) {
  ctx.fillStyle = color;
  for (let i = 0; i < 2; i++) {
    const cx = i * (TILE_W / 2) + TILE_W / 4;
    for (let y = 0; y < 64; y++) {
      const half = 10 + y * 1.6 + Math.sin(y * 0.7 + i) * 2;
      ctx.fillRect(Math.round(cx - half), baseY - 64 + y, Math.round(half * 2), 1);
    }
    // lava streaks down the flank
    ctx.fillStyle = glow;
    for (let y = 2; y < 40; y++) ctx.fillRect(Math.round(cx - 2 + Math.sin(y * 0.4) * 3 + y * 0.35), baseY - 62 + y, 1, 1);
    ctx.fillStyle = color;
  }
}

const SCENES: Record<AdventureScene, SceneDef> = {
  meadow: {
    sky: ["#2b3a67", "#496a9a", "#9a92b8", "#e3a6a1", "#f6d3a3"],
    layers: [
      { color: "#8f8db6", speed: 0.08, draw: (c, col) => { ridge(c, col, 78, 26, 1); snowcaps(c, "#e6e4f4", 78, 26, 1); } },
      { color: "#5d6f96", speed: 0.22, draw: (c, col) => ridge(c, col, 92, 14, 3, 0.6) },
      { color: "#3e5576", speed: 0.45, draw: (c, col) => pines(c, col, 104, 26, 10, 22, 7) },
    ],
    ground: { top: "#7fb08a", edge: "#a8d6a4", fill: "#3b3450", detail: "#4c4466", deep: "#2a2440" },
    ambient: 0,
    dark: "8, 10, 28",
    particle: { color: "#ffc2d1", count: 18, kind: "petal" },
  },
  forest: {
    sky: ["#141a33", "#1f2a4d", "#2f3f66", "#465a82"],
    layers: [
      { color: "#3a4d72", speed: 0.1, draw: (c, col) => pines(c, col, 92, 40, 18, 34, 11) },
      { color: "#2a3a5c", speed: 0.25, draw: (c, col) => pines(c, col, 100, 30, 22, 42, 13) },
      { color: "#1a2642", speed: 0.5, draw: (c, col) => pines(c, col, 108, 18, 30, 54, 17) },
    ],
    ground: { top: "#3f7a64", edge: "#6fb08a", fill: "#251f36", detail: "#342b4a", deep: "#1a1528" },
    ambient: 0.18,
    dark: "4, 6, 20",
    particle: { color: "#fff2a1", count: 16, kind: "firefly" },
  },
  cave: {
    sky: ["#0c0a1c", "#151231", "#1d1940"],
    layers: [
      { color: "#262048", speed: 0.1, draw: (c, col) => { ridge(c, col, 96, 18, 5, 1.4); crystals(c, ["#3fbfd8", "#c25ab8"], 96, 14, 21); } },
      { color: "#1c1838", speed: 0.3, draw: (c, col) => stalactites(c, col, 30, 26, 23) },
      { color: "#13102a", speed: 0.55, draw: (c, col) => { stalactites(c, col, 16, 14, 29); crystals(c, ["#5ef0ff", "#ff6ad5", "#9b8cff"], 110, 9, 31); } },
    ],
    ground: { top: "#4a3f6e", edge: "#6e62a0", fill: "#221c3a", detail: "#2e2650", deep: "#16122a" },
    ambient: 0.32,
    dark: "4, 2, 16",
    particle: { color: "#9fe8ff", count: 14, kind: "dust" },
  },
  castle: {
    sky: ["#0b1029", "#141d45", "#24326a", "#3a4a80"],
    layers: [
      { color: "#202a55", speed: 0.06, draw: (c, col) => castleSkyline(c, col, 96) },
      { color: "#171d42", speed: 0.5, draw: (c, col) => arches(c, col, 112) },
    ],
    ground: { top: "#6a6a8e", edge: "#9a9ac0", fill: "#2e2c48", detail: "#3c3a5c", deep: "#1e1c34" },
    ambient: 0.22,
    dark: "4, 4, 22",
    particle: { color: "#f4f1d6", count: 30, kind: "star" },
  },
  volcano: {
    sky: ["#1e0a18", "#3c1022", "#6e1c2a", "#a8382a"],
    layers: [
      { color: "#3a1626", speed: 0.08, draw: (c, col) => volcanoPeak(c, col, "#ff7a2a", 96) },
      { color: "#2a1020", speed: 0.3, draw: (c, col) => ridge(c, col, 102, 12, 9, 1.6) },
      { color: "#1a0a14", speed: 0.55, draw: (c, col) => ridge(c, col, 110, 8, 19, 2) },
    ],
    ground: { top: "#4a2a36", edge: "#6e3e4a", fill: "#22141e", detail: "#ff6a2a", deep: "#160a12" },
    ambient: 0.12,
    dark: "20, 2, 6",
    particle: { color: "#ffb03a", count: 26, kind: "ember" },
  },
};

export const sceneDark = (scene: AdventureScene) => SCENES[scene].dark;
export const sceneAmbient = (scene: AdventureScene) => SCENES[scene].ambient;

// ── baking ──────────────────────────────────────────────────────────────
const baked = new Map<string, HTMLCanvasElement>();
const canvasOf = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

function skyCanvas(def: SceneDef) {
  const c = canvasOf(W, GROUND_Y);
  const ctx = c.getContext("2d")!;
  const stops = def.sky;
  for (let y = 0; y < GROUND_Y; y++) {
    const t = (y / (GROUND_Y - 1)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < W; x++) {
      // solid bands, dithered only across the last stretch before the next colour
      const edge = Math.max(0, (f - 0.55) / 0.45);
      ctx.fillStyle = edge > dither(x, y) ? stops[i + 1] : stops[i];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function layerCanvas(layer: SceneDef["layers"][number]) {
  const c = canvasOf(TILE_W, H);
  layer.draw(c.getContext("2d")!, layer.color);
  return c;
}

function groundCanvas(def: SceneDef, scene: AdventureScene) {
  const c = canvasOf(TILE_W, H - GROUND_Y);
  const ctx = c.getContext("2d")!;
  const g = def.ground;
  ctx.fillStyle = g.fill;
  ctx.fillRect(0, 0, TILE_W, H - GROUND_Y);
  // a bright rim, then the top surface with tufts hanging over the edge
  ctx.fillStyle = g.top;
  ctx.fillRect(0, 0, TILE_W, 4);
  ctx.fillStyle = g.edge;
  ctx.fillRect(0, 0, TILE_W, 1);
  for (let x = 0; x < TILE_W; x++) {
    if (hash(x, 3) > 0.62) {
      ctx.fillStyle = g.top;
      ctx.fillRect(x, 4, 1, 1 + Math.round(hash(x, 4) * 2));
    }
    if (hash(x, 5) > 0.86) {
      ctx.fillStyle = g.edge;
      ctx.fillRect(x, -0, 1, 1);
      ctx.fillRect(x, 1, 1, 1);
    }
  }
  // stones / bricks / cracks in the earth
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(hash(i, 6) * TILE_W);
    const y = 9 + Math.floor(hash(i, 7) * (H - GROUND_Y - 12));
    const w = 2 + Math.floor(hash(i, 8) * 5);
    ctx.fillStyle = scene === "volcano" && i % 4 === 0 ? g.detail : g.detail;
    if (scene === "volcano" && i % 4 !== 0) ctx.fillStyle = "#2e1a26";
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = g.deep;
    ctx.fillRect(x, y + 1, w, 1);
  }
  if (scene === "castle") {
    ctx.fillStyle = g.deep;
    for (let x = 0; x < TILE_W; x += 16) ctx.fillRect(x, 5, 1, H - GROUND_Y - 5);
    for (let y = 12; y < H - GROUND_Y; y += 8) ctx.fillRect(0, y, TILE_W, 1);
  }
  return c;
}

function bakeScene(scene: AdventureScene) {
  const def = SCENES[scene];
  const key = scene;
  if (!baked.has(`${key}-sky`)) {
    baked.set(`${key}-sky`, skyCanvas(def));
    def.layers.forEach((layer, i) => baked.set(`${key}-l${i}`, layerCanvas(layer)));
    baked.set(`${key}-ground`, groundCanvas(def, scene));
  }
}

function drawTiled(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, offset: number, y: number) {
  const x = -Math.round(mod(offset, TILE_W));
  ctx.drawImage(img, x, y);
  ctx.drawImage(img, x + TILE_W, y);
}

/**
 * The scene behind the characters at scroll `scroll` (logical px) and time `t`
 * (seconds): sky, parallax layers, the sky's own lights (moon, sun glow),
 * then the ground.
 */
export function drawScene(ctx: CanvasRenderingContext2D, scene: AdventureScene, scroll: number, t: number) {
  bakeScene(scene);
  const def = SCENES[scene];
  ctx.drawImage(baked.get(`${scene}-sky`)!, 0, 0);

  if (scene === "meadow") glow(ctx, 210, 92, 46, "255, 214, 160", 0.35); // low sun behind the hills
  if (scene === "castle") {
    glow(ctx, 220, 30, 30, "244, 241, 214", 0.25);
    ctx.fillStyle = "#f4f1d6";
    disc(ctx, 220, 30, 9);
    ctx.fillStyle = "#d9d4b0";
    ctx.fillRect(216, 27, 3, 2);
    ctx.fillRect(222, 33, 2, 2);
  }

  def.layers.forEach((layer, i) => drawTiled(ctx, baked.get(`${scene}-l${i}`)!, scroll * layer.speed, 0));

  if (scene === "castle") {
    // torches on the pillars, flickering
    for (let x = -mod(scroll * 0.5, 72) + 6; x < W + 72; x += 72) {
      const flick = 0.75 + 0.25 * Math.sin(t * 14 + x);
      glow(ctx, x, 60, 18, "255, 179, 71", 0.35 * flick);
      ctx.fillStyle = "#ffcf6a";
      ctx.fillRect(Math.round(x) - 1, 57, 3, 3);
      ctx.fillStyle = "#fff3c4";
      ctx.fillRect(Math.round(x), 56 + Math.round(Math.sin(t * 20 + x)), 1, 2);
    }
  }
  if (scene === "cave") {
    // crystals breathe light
    for (let i = 0; i < 9; i++) {
      const x = mod(i * 64 - scroll * 0.55 + 10, W + 40) - 20;
      glow(ctx, x, 104, 14, i % 2 ? "255, 106, 213" : "94, 240, 255", 0.18 + 0.1 * Math.sin(t * 2 + i));
    }
  }
  if (scene === "volcano") glow(ctx, mod(TILE_W / 4 - scroll * 0.08, TILE_W) % W, 34, 40, "255, 110, 40", 0.22 + 0.06 * Math.sin(t * 1.5));

  drawTiled(ctx, baked.get(`${scene}-ground`)!, scroll, GROUND_Y);
  if (scene === "volcano") {
    // lava seams in the ground pulse
    ctx.fillStyle = `rgba(255, 120, 40, ${0.25 + 0.2 * Math.sin(t * 3)})`;
    for (let x = -mod(scroll, 48); x < W; x += 48) ctx.fillRect(Math.round(x + 10), GROUND_Y + 14, 9, 1);
  }
}

/** Particles in the air (drawn over the characters for depth). */
export function drawParticles(ctx: CanvasRenderingContext2D, scene: AdventureScene, scroll: number, t: number) {
  const p = SCENES[scene].particle;
  for (let i = 0; i < p.count; i++) {
    const seedX = hash(i, 40) * W;
    const seedY = hash(i, 41) * GROUND_Y;
    let x = 0;
    let y = 0;
    let size = 1;
    let alpha = 1;
    switch (p.kind) {
      case "petal":
        x = mod(seedX - t * (10 + hash(i, 42) * 8) - scroll * 0.8, W);
        y = mod(seedY + t * (6 + hash(i, 43) * 6) + Math.sin(t * 2 + i) * 3, GROUND_Y);
        size = hash(i, 44) > 0.6 ? 2 : 1;
        break;
      case "firefly":
        x = mod(seedX + Math.sin(t * 0.7 + i) * 12 - scroll * 0.6, W);
        y = 40 + mod(seedY + Math.cos(t * 0.9 + i) * 8, 64);
        alpha = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2.4 + i * 1.7));
        glow(ctx, x, y, 5, "255, 242, 161", alpha * 0.4);
        break;
      case "dust":
        x = mod(seedX + t * 3 - scroll * 0.5, W);
        y = mod(seedY - t * 2, GROUND_Y);
        alpha = 0.3 + 0.4 * hash(i, 45);
        break;
      case "star":
        x = mod(seedX - scroll * 0.02, W);
        y = hash(i, 46) * 60;
        alpha = 0.3 + 0.7 * Math.max(0, Math.sin(t * (1 + hash(i, 47) * 2) + i));
        break;
      case "ember":
        x = mod(seedX + Math.sin(t + i) * 6 - scroll * 0.7, W);
        y = mod(GROUND_Y - t * (10 + hash(i, 48) * 14) - seedY, GROUND_Y);
        alpha = 0.5 + 0.5 * Math.sin(t * 6 + i);
        break;
    }
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }
  ctx.globalAlpha = 1;
}

/** A soft additive light. `rgb` like "255, 200, 120". */
const GLOW_SIZE = 64;
const glows = new Map<string, HTMLCanvasElement>();
function glowSprite(rgb: string) {
  let sprite = glows.get(rgb);
  if (!sprite) {
    sprite = canvasOf(GLOW_SIZE, GLOW_SIZE);
    const g = sprite.getContext("2d")!;
    const half = GLOW_SIZE / 2;
    const gradient = g.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, `rgba(${rgb}, 1)`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = gradient;
    g.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
    glows.set(rgb, sprite);
  }
  return sprite;
}

/** A soft additive light (one pre-baked sprite per colour, scaled). `rgb` like "255, 200, 120". */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, alpha: number) {
  if (alpha <= 0 || r <= 0) return;
  const prevOp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = prevAlpha * Math.min(1, alpha);
  ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prevAlpha;
  ctx.globalCompositeOperation = prevOp;
}

function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}
