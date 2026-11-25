"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DREAM_ARRIVAL, DREAM_BOUNDS, DREAM_HOME, ISLES, TEACUP, isle, type DreamIsle } from "../engine/dream-sea";
import { hash } from "../engine/island";
import { mergeParts, paint, useBuilt } from "./island/shared";
import { quality } from "./quality";

/**
 * The dream sea's islands and everything small that grows, lies or hangs on
 * them: ragged lawns on rock that tapers away underneath, rim stones and
 * crystals, grass, star flowers, lights dangling from the edges, and each
 * island's own keepsakes (pearls and coral by the shell, sugar and a spoon by
 * the teacup, lit roots and mushrooms by the tree, star candles by the moon
 * lantern, a ring of rune stones on the summit).
 *
 * None of it is solid: what you stand on is DREAM_SOLIDS (engine/dream-sea.ts),
 * and the lawns here are drawn to those circles. It is all static, so it is
 * baked into three meshes that share three materials (lit, glowing, and light
 * on the water): a phone draws the lot in three calls, and the CPU renderer
 * the playtests use compiles three shaders, however much is added here.
 */

const STAR = "#ffe9a8";
const SILVER = "#dfe6ff";
const VIOLET = "#b3a4ff";
const PINK = "#ffc4e6";
const AQUA = "#9fd8ff";
const LAWN = "#a99cf0";
const LAWN_DEEP = "#8f82e0";
const LAWN_PALE = "#cfc8ff";
const MOSS = "#6f63c8";
const ROCK = "#3a386e";
const ROCK_PALE = "#8a86c4";
const ROCK_DEEP = "#151840";
const STONE = "#cfd6ff";

/** Grass, flowers, lily pads and motes are thinned by this on slower devices (quality.ts) */
const STRIDE = quality.undergrowthStride;
const thin = (k: number) => k % STRIDE === 0;

type Parts = THREE.BufferGeometry[];
type Triple = [number, number, number];

/** What gets baked: lit matter, things that glow, and light lying on the sea */
interface Kit {
  matte: Parts;
  glow: Parts;
  halo: Parts;
}

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const P = new THREE.Vector3();
const S = new THREE.Vector3();

/** Paint a part one colour, move it into place, and add it to a list to be merged */
function put(parts: Parts, geometry: THREE.BufferGeometry, color: string, at: Triple, rot: Triple = [0, 0, 0], scale: number | Triple = 1) {
  const s: Triple = typeof scale === "number" ? [scale, scale, scale] : scale;
  geometry.applyMatrix4(M.compose(P.set(...at), Q.setFromEuler(E.set(...rot)), S.set(...s)));
  parts.push(paint(geometry, color));
}

/** Colour a part vertex by vertex (blends, where `paint` is flat) */
function shade(geometry: THREE.BufferGeometry, colorAt: (x: number, y: number, z: number, out: THREE.Color) => void) {
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const c = new THREE.Color();
  for (let k = 0; k < position.count; k++) {
    colorAt(position.getX(k), position.getY(k), position.getZ(k), c);
    c.toArray(colors, k * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Move every vertex (the primitives are only starting points for the island shapes) */
function warp(geometry: THREE.BufferGeometry, move: (v: THREE.Vector3) => void) {
  const position = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let k = 0; k < position.count; k++) {
    move(v.fromBufferAttribute(position, k));
    position.setXYZ(k, v.x, v.y, v.z);
  }
  return geometry;
}

const C = new THREE.Color();
const mix = (a: string, b: string, t: number, out = new THREE.Color()) => out.set(a).lerp(C.set(b), t);

/** A cone or post standing on its base (three's are centred) */
const standing = (g: THREE.BufferGeometry, height: number) => g.translate(0, height / 2, 0);

// ── the islands themselves ───────────────────────────────────────────────────

/** Each island's own wobble, so no two have the same outline */
const seed = (i: DreamIsle) => i.x * 0.37 + i.z * 0.11;

/**
 * The lawn's edge at angle `a`: the island's circle, pushed in and out a
 * little. It stays within a hand of the circle you can actually stand on
 * (−3% … +6%), so the edge you see is the edge you fall off.
 */
function edge(i: DreamIsle, a: number) {
  const s = seed(i);
  return i.r * (1.015 + 0.025 * Math.sin(3 * a + s) + 0.015 * Math.sin(5 * a + s * 2.3) + 0.01 * Math.sin(8 * a + s * 4.1));
}

/** The high islands float; the low ones stand in the sea */
const floats = (i: DreamIsle) => i.top > 3;

/** How far the rock reaches down: into the sea, or (floating) to a point that clears your head as you walk under */
const rockDepth = (i: DreamIsle) => (floats(i) ? Math.min(i.r * 0.9, i.top - 2.6) : i.top + 0.4);

/** The rock's radius (as a share of the lawn's) from its top (0) to its foot (1) */
const FLOATING = [0.96, 0.86, 0.62, 0.46, 0.24, 0.04];
const ROOTED = [0.96, 0.9, 0.8, 0.68, 0.56, 0.46];
function profile(i: DreamIsle, v: number) {
  const shape = floats(i) ? FLOATING : ROOTED;
  const f = THREE.MathUtils.clamp(v, 0, 1) * (shape.length - 1);
  const k = Math.min(Math.floor(f), shape.length - 2);
  return THREE.MathUtils.lerp(shape[k], shape[k + 1], f - k);
}

/** The lawn sits on this much turf before the rock starts */
const TURF = 0.28;

function isleBody(kit: Kit, i: DreamIsle) {
  const s = seed(i);
  const depth = rockDepth(i);

  // the lawn: mottled, paler at the rim
  const lawn = warp(new THREE.RingGeometry(0.001, 1, 40, 3).rotateX(-Math.PI / 2), (v) => {
    const reach = edge(i, Math.atan2(v.z, v.x));
    v.set(i.x + v.x * reach, i.top, i.z + v.z * reach);
  });
  shade(lawn, (x, _y, z, out) => {
    const rad = Math.hypot(x - i.x, z - i.z) / i.r;
    const patch = 0.5 + 0.5 * Math.sin(x * 1.7 + s) * Math.cos(z * 1.3 - s);
    mix(LAWN_DEEP, LAWN, patch, out);
    if (rad > 0.9) out.lerp(C.set(LAWN_PALE), 0.7);
  });
  kit.matte.push(lawn);

  // its turf, hanging over the rock in uneven drips
  const skirt = warp(new THREE.CylinderGeometry(1, 1, 1, 40, 1, true), (v) => {
    const a = Math.atan2(v.z, v.x);
    const upper = v.y > 0;
    const reach = edge(i, a) * (upper ? 1 : 0.97);
    const drip = TURF + 0.24 * (0.5 + 0.5 * Math.sin(7 * a + s)) + 0.12 * (0.5 + 0.5 * Math.sin(13 * a - s));
    v.set(i.x + Math.cos(a) * reach, upper ? i.top : i.top - drip, i.z + Math.sin(a) * reach);
  });
  shade(skirt, (_x, y, _z, out) => mix(MOSS, LAWN_PALE, y > i.top - 0.01 ? 1 : 0, out));
  kit.matte.push(skirt);

  // the rock: lumpier the further down, in bands like strata
  const rock = warp(new THREE.CylinderGeometry(1, 1, 1, 16, 5, true), (v) => {
    const a = Math.atan2(v.z, v.x);
    const down = 0.5 - v.y;
    const lump = 1 + down * (0.16 * Math.sin(3 * a + s) + 0.1 * Math.sin(7 * a + s * 2));
    const reach = edge(i, a) * profile(i, down) * lump;
    const ragged = down > 0.1 && down < 0.9 ? depth * 0.06 * Math.sin(5 * a + down * 20) : 0;
    v.set(i.x + Math.cos(a) * reach, i.top - TURF - depth * down + ragged, i.z + Math.sin(a) * reach);
  });
  shade(rock, (_x, y, _z, out) => {
    const down = THREE.MathUtils.clamp((i.top - TURF - y) / depth, 0, 1);
    mix(ROCK, ROCK_DEEP, down, out);
    if (Math.round(down * 5) % 2 === 1) out.lerp(C.set(VIOLET), 0.12);
  });
  kit.matte.push(rock);
}

/** Stones and crystal clusters round the rim, half sunk in the turf */
function isleRim(kit: Kit, i: DreamIsle) {
  const s = Math.round(seed(i) * 10);
  const count = Math.round(i.r * 2.4);
  for (let k = 0; k < count; k++) {
    const a = ((k + hash(k, s) * 0.6) / count) * Math.PI * 2;
    const reach = edge(i, a) - 0.32;
    const x = i.x + Math.cos(a) * reach;
    const z = i.z + Math.sin(a) * reach;
    if (hash(k, s + 1) < 0.35) {
      // a cluster of crystal shards, leaning apart
      for (let n = 0; n < 3; n++) {
        const h = 0.35 + hash(k * 3 + n, s + 2) * 0.5;
        put(
          kit.glow,
          standing(new THREE.ConeGeometry(0.085, h, 5), h),
          [VIOLET, SILVER, AQUA][(k + n) % 3],
          [x + (n - 1) * 0.1, i.top - 0.03, z + (hash(n, s + k) - 0.5) * 0.2],
          [(hash(k + n, s + 3) - 0.5) * 0.7, 0, (n - 1) * -0.4],
        );
      }
    } else {
      const size = 0.2 + hash(k, s + 4) * 0.22;
      put(
        kit.matte,
        new THREE.IcosahedronGeometry(1, 0),
        `#${mix(ROCK, ROCK_PALE, hash(k, s + 5)).getHexString()}`,
        [x, i.top + size * 0.2, z],
        [hash(k, s + 6), hash(k, s + 7) * 6, 0],
        [size * 1.25, size * 0.7, size],
      );
    }
  }
}

/** Lights on threads, hanging from the lawn's edge down toward the sea */
function isleCharms(kit: Kit, i: DreamIsle) {
  const s = Math.round(seed(i) * 10) + 40;
  const count = Math.round(i.r * 3);
  // not into the water, and not so low under a floating island that you walk into them
  const longest = Math.min(1.7, i.top - (floats(i) ? 2.4 : 0.6));
  for (let k = 0; k < count; k++) {
    const a = ((k + hash(k, s) * 0.7) / count) * Math.PI * 2;
    const reach = edge(i, a) * 0.985;
    const x = i.x + Math.cos(a) * reach;
    const z = i.z + Math.sin(a) * reach;
    const length = longest * (0.3 + 0.7 * hash(k, s + 1));
    const from = i.top - TURF;
    put(kit.matte, new THREE.CylinderGeometry(0.012, 0.012, length, 3), SILVER, [x, from - length / 2, z]);
    put(kit.glow, new THREE.OctahedronGeometry(0.075, 0), [STAR, AQUA, PINK, SILVER][k % 4], [x, from - length - 0.07, z], [0, a, 0], [1, 1.5, 1]);
  }
}

/** A circle on an island (relative to its centre) to leave bare: where its dream thing stands */
type Clear = [x: number, z: number, r: number];

/** Tufts of grass and star flowers wherever the island is bare */
function isleGrowth(kit: Kit, i: DreamIsle, clear: readonly Clear[]) {
  const s = Math.round(seed(i) * 10) + 80;
  const free = (x: number, z: number) => clear.every(([cx, cz, r]) => Math.hypot(x - cx, z - cz) > r);
  const spot = (k: number, salt: number): [number, number] => {
    const rad = Math.sqrt(hash(k, salt)) * i.r * 0.9;
    const a = hash(k, salt + 1) * Math.PI * 2;
    return [Math.cos(a) * rad, Math.sin(a) * rad];
  };
  const tufts = Math.floor(i.r * i.r * 1.8);
  for (let k = 0; k < tufts; k++) {
    const [x, z] = spot(k, s);
    if (!thin(k) || !free(x, z)) continue;
    for (let n = 0; n < 3; n++) {
      const h = 0.2 + hash(k * 3 + n, s + 2) * 0.22;
      put(
        kit.matte,
        standing(new THREE.ConeGeometry(0.04, h, 3), h),
        `#${mix(LAWN_DEEP, LAWN_PALE, hash(k + n, s + 3)).getHexString()}`,
        [i.x + x + (n - 1) * 0.06, i.top, i.z + z + (hash(n, k) - 0.5) * 0.1],
        [(hash(k, n + s) - 0.5) * 0.6, 0, (n - 1) * -0.3],
      );
    }
  }
  const flowers = Math.round(i.r * 3);
  for (let k = 0; k < flowers; k++) {
    const [x, z] = spot(k, s + 20);
    if (!thin(k) || !free(x, z)) continue;
    const h = 0.25 + hash(k, s + 22) * 0.25;
    put(kit.matte, standing(new THREE.CylinderGeometry(0.012, 0.02, h, 3), h), MOSS, [i.x + x, i.top, i.z + z]);
    put(kit.glow, new THREE.OctahedronGeometry(0.075, 0), [STAR, PINK, SILVER, AQUA][k % 4], [i.x + x, i.top + h + 0.03, i.z + z], [0, k, 0], [1, 0.7, 1]);
  }
}

/** Where an island meets the sea: light round its foot, or (floating) its glow lying on the water below */
function isleLight(kit: Kit, i: DreamIsle) {
  const flat = (g: THREE.BufferGeometry) => g.rotateX(-Math.PI / 2).translate(i.x, 0.03, i.z);
  const fromCentre = (x: number, z: number) => Math.hypot(x - i.x, z - i.z);
  if (floats(i)) {
    // additive: black is nothing, so the disc fades out to its rim
    const reach = i.r * 1.25;
    kit.halo.push(shade(flat(new THREE.CircleGeometry(reach, 40)), (x, _y, z, out) => mix("#2c2a78", "#000000", fromCentre(x, z) / reach, out)));
    kit.halo.push(paint(flat(new THREE.RingGeometry(i.r * 0.86, i.r * 0.86 + 0.07, 48)), "#4a46a8"));
    return;
  }
  // the rock's widest reach at the waterline
  const down = (i.top - TURF) / rockDepth(i);
  const shore = i.r * 1.06 * profile(i, down) * (1 + 0.26 * down) + 0.12;
  kit.halo.push(
    shade(flat(new THREE.RingGeometry(shore - 0.5, shore + 1.8, 48, 1)), (x, _y, z, out) =>
      mix("#322e8c", "#000000", fromCentre(x, z) > shore ? 1 : 0, out),
    ),
  );
  kit.halo.push(paint(flat(new THREE.RingGeometry(shore, shore + 0.09, 48)), "#6a72d8"));
  kit.halo.push(paint(flat(new THREE.RingGeometry(shore + 0.6, shore + 0.66, 48)), "#343a98"));
}

/** Small rocks adrift round a floating island, below its lawn (too low and small to take for steps) */
function isleDrift(kit: Kit, i: DreamIsle) {
  const s = Math.round(seed(i) * 10) + 120;
  const count = Math.round(i.r * 1.6);
  for (let k = 0; k < count; k++) {
    const a = ((k + hash(k, s)) / count) * Math.PI * 2;
    const reach = i.r + 0.7 + hash(k, s + 1) * 1.3;
    const size = 0.16 + hash(k, s + 2) * 0.2;
    const at: Triple = [i.x + Math.cos(a) * reach, i.top - 1 - hash(k, s + 3) * 1.6, i.z + Math.sin(a) * reach];
    put(kit.matte, new THREE.IcosahedronGeometry(1, 0), ROCK, at, [hash(k, s + 4) * 3, hash(k, s + 5) * 6, 0], [size * 1.2, size * 0.8, size]);
    if (k % 2 === 0) put(kit.glow, standing(new THREE.ConeGeometry(0.05, 0.3, 4), 0.3), k % 4 ? VIOLET : AQUA, [at[0], at[1] + size * 0.5, at[2]], [0.2, 0, -0.2]);
  }
}

// ── each island's keepsakes ──────────────────────────────────────────────────

/** By the shell: pearls it has spilled, starfish, small shells, coral */
function shellThings(kit: Kit) {
  const i = isle("shell");
  const on = (x: number, y: number, z: number): Triple => [i.x + x, i.top + y, i.z + z];
  const pearls: [number, number, number][] = [
    [-1.3, 1.9, 0.11],
    [-0.5, 2.5, 0.15],
    [0.9, 2.2, 0.12],
    [1.7, 1.5, 0.09],
    [2.3, 2.4, 0.13],
    [-2.4, 2.0, 0.1],
  ];
  pearls.forEach(([x, z, r], k) => put(kit.glow, new THREE.IcosahedronGeometry(r, 1), k % 2 ? "#fff0f8" : PINK, on(x, r * 0.8, z)));
  // starfish: five arms lying flat
  const starfish: [number, number, number][] = [
    [2.7, 0.9, 0.4],
    [-2.9, 0.6, 1.3],
  ];
  for (const [x, z, turn] of starfish) {
    for (let arm = 0; arm < 5; arm++) {
      const a = turn + (arm / 5) * Math.PI * 2;
      // a cone tipped over, pointing out from the middle
      const g = new THREE.ConeGeometry(0.1, 0.42, 4).rotateZ(-Math.PI / 2).translate(0.2, 0, 0);
      put(kit.matte, g, "#f0a8d0", on(x, 0.05, z), [0, a, 0], [1, 0.45, 1]);
    }
  }
  // little shells, tipped on their sides
  const shells: [number, number][] = [
    [-0.2, 3.1],
    [3.1, -0.4],
    [-3.2, -1.2],
  ];
  shells.forEach(([x, z], k) => put(kit.matte, new THREE.ConeGeometry(0.17, 0.42, 7), "#f6dcec", on(x, 0.12, z), [1.3, k * 2.1, 0.2]));
  // coral: a few branches each, a light at every tip
  const corals: [number, number][] = [
    [-2.7, -2.1],
    [3.0, -1.7],
    [1.3, 3.1],
  ];
  corals.forEach(([x, z], c) => {
    for (let b = 0; b < 4; b++) {
      const h = 0.45 + hash(c * 4 + b, 61) * 0.5;
      const lean: Triple = [(hash(b, 62 + c) - 0.5) * 1.1, 0, (hash(b, 63 + c) - 0.5) * 1.1];
      put(kit.matte, standing(new THREE.CylinderGeometry(0.035, 0.07, h, 5), h), b % 2 ? "#c08ae0" : "#e09ad0", on(x, 0, z), lean);
      put(kit.glow, new THREE.IcosahedronGeometry(0.06, 0).translate(0, h + 0.03, 0), b % 2 ? PINK : VIOLET, on(x, 0, z), lean);
    }
  });
}

/** By the teacup: sugar lumps and a spoon stuck in the lawn */
function teacupThings(kit: Kit) {
  const i = isle("teacup");
  const on = (x: number, y: number, z: number): Triple => [i.x + x, i.top + y, i.z + z];
  const lump = 0.4;
  const lumps: [number, number, number, number][] = [
    [2.7, lump / 2, 1.9, 0.3],
    [3.1, lump / 2, 1.45, 1.1],
    [2.85, lump * 1.5, 1.7, 0.7],
    [-1.1, lump / 2, 3.2, 0.5],
  ];
  for (const [x, y, z, turn] of lumps) put(kit.matte, new THREE.BoxGeometry(lump, lump, lump), "#f4f2ff", on(x, y, z), [0, turn, 0]);
  // a few grains it has shed, catching the light
  for (let k = 0; k < 7; k++) {
    put(kit.glow, new THREE.BoxGeometry(0.06, 0.06, 0.06), SILVER, on(2.2 + hash(k, 71) * 1.4, 0.03, 1.2 + hash(k, 72) * 1.4), [0, k, 0]);
  }
  // the spoon, handle down in the turf, leaning out over the edge
  const lean: Triple = [0.25, 0.6, 0.3];
  const at = on(-2.9, 0, 1.5);
  put(kit.matte, standing(new THREE.CylinderGeometry(0.05, 0.035, 1.9, 6), 1.9), SILVER, at, lean);
  put(kit.matte, new THREE.SphereGeometry(1, 12, 8).scale(0.3, 0.42, 0.07).translate(0, 2.2, 0), SILVER, at, lean);
}

/** The upside-down tree's roots (drawn in dream-sea.tsx), fanning out above its trunk */
export const TREE = { x: isle("tree").x - 0.9, z: isle("tree").z, crownTop: 3.4 };
export const TREE_ROOTS = Array.from({ length: 6 }, (_, k) => ({
  a: (k / 6) * Math.PI * 2 + 0.4,
  tilt: 0.55 + hash(k, 9) * 0.3,
  length: 1.6 + hash(k, 10) * 0.8,
}));

/** By the tree: a light at each root's tip, leaves drifting up off the crown, mushrooms in its shade */
function treeThings(kit: Kit) {
  const i = isle("tree");
  const on = (x: number, y: number, z: number): Triple => [i.x + x, i.top + y, i.z + z];
  for (const [k, root] of TREE_ROOTS.entries()) {
    // the same turn the root itself is drawn with
    const tip = new THREE.Vector3(0, root.length, 0).applyEuler(new THREE.Euler(0, root.a, root.tilt));
    put(kit.glow, new THREE.IcosahedronGeometry(0.1, 1), k % 2 ? STAR : AQUA, [TREE.x + tip.x, i.top + TREE.crownTop + tip.y + 0.06, TREE.z + tip.z]);
  }
  // leaves: some fallen, most falling the wrong way
  for (let k = 0; k < 16; k++) {
    const a = hash(k, 81) * Math.PI * 2;
    // the fallen ones stay on the lawn; the rest may drift out past its edge
    const reach = 1.2 + hash(k, 82) * (k < 6 ? 0.7 : 1.3);
    const y = k < 6 ? 0.04 : 0.6 + hash(k, 83) * 3.2;
    put(
      kit.matte,
      new THREE.OctahedronGeometry(0.15, 0),
      k % 3 ? "#5a7fd8" : "#86a4f4",
      [TREE.x + Math.cos(a) * reach, i.top + y, TREE.z + Math.sin(a) * reach],
      k < 6 ? [0, a, 0] : [hash(k, 84) * 3, a, hash(k, 85) * 3],
      [1, 0.12, 0.6],
    );
  }
  const mushrooms: [number, number][] = [
    [1.9, 1.6],
    [-1.6, 2.1],
    [0.9, -2.3],
  ];
  mushrooms.forEach(([x, z], m) => {
    for (let n = 0; n < 3; n++) {
      const h = 0.16 + hash(m * 3 + n, 86) * 0.2;
      const at = on(x + (n - 1) * 0.24, 0, z + (hash(n, 87 + m) - 0.5) * 0.3);
      put(kit.matte, standing(new THREE.CylinderGeometry(0.035, 0.05, h, 5), h), SILVER, at);
      put(kit.glow, new THREE.SphereGeometry(0.1 + h * 0.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), (m + n) % 2 ? AQUA : VIOLET, [at[0], at[1] + h, at[2]], [0, 0, 0], [1, 0.8, 1]);
    }
  });
}

/** By the moon lantern: a plinth under its post, star candles in a ring, a cairn */
function moonThings(kit: Kit) {
  const i = isle("moon");
  const on = (x: number, y: number, z: number): Triple => [i.x + x, i.top + y, i.z + z];
  put(kit.matte, standing(new THREE.CylinderGeometry(0.26, 0.34, 0.16, 6), 0.16), STONE, on(-0.9, 0, 0));
  for (let k = 0; k < 5; k++) {
    // round the front, clear of the post behind
    const a = 0.25 + (k / 4) * (Math.PI - 0.5);
    const h = 0.4 + (k % 2) * 0.2;
    const at = on(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9);
    put(kit.matte, standing(new THREE.CylinderGeometry(0.02, 0.03, h, 4), h), SILVER, at);
    put(kit.glow, new THREE.OctahedronGeometry(0.11, 0), "#fff2b8", [at[0], at[1] + h + 0.12, at[2]], [0, a, 0], [1, 1.5, 0.5]);
  }
  [0.3, 0.22, 0.14].reduce((y, size, k) => {
    put(kit.matte, new THREE.IcosahedronGeometry(1, 0), k % 2 ? STONE : "#9aa0e0", on(1.3, y + size * 0.6, -1.3), [0, k * 1.3, 0], [size, size * 0.65, size]);
    return y + size * 1.2;
  }, 0);
}

/** The summit's standing stones, turned so the gap between two of them faces the jellyfish you climb up by */
const SUMMIT_STONES = (() => {
  const i = isle("summit");
  const from = isle("tree");
  const gap = Math.atan2(from.z - i.z, from.x - i.x);
  return Array.from({ length: 7 }, (_, k) => ({ a: gap + ((k + 0.5) / 7) * Math.PI * 2, h: 1.2 + hash(k, 21) * 0.9 }));
})();

/** The summit: rune stones with a star over each, a dais, and a pattern in the lawn that points them all at its middle */
function summitThings(kit: Kit) {
  const i = isle("summit");
  const on = (x: number, y: number, z: number): Triple => [i.x + x, i.top + y, i.z + z];
  const ring = i.r - 0.6;
  for (const [k, { a, h }] of SUMMIT_STONES.entries()) {
    const at = on(Math.cos(a) * ring, -0.05, Math.sin(a) * ring);
    const lean: Triple = [(hash(k, 22) - 0.5) * 0.16, -a, (hash(k, 23) - 0.5) * 0.16];
    put(kit.matte, standing(new THREE.CylinderGeometry(0.19, 0.3, h, 5), h), STONE, at, lean);
    put(kit.glow, new THREE.CylinderGeometry(0.262, 0.272, 0.06, 5).translate(0, h * 0.5, 0), k % 2 ? VIOLET : STAR, at, lean);
    put(kit.glow, new THREE.OctahedronGeometry(0.11, 0).scale(1, 1.5, 1).translate(0, h + 0.36, 0), STAR, at, lean);
    // a line in the lawn from the ring to each stone
    put(kit.glow, new THREE.PlaneGeometry(ring - 0.55 - 1.8, 0.05).rotateX(-Math.PI / 2).translate((ring - 0.55 + 1.8) / 2, 0, 0), LAWN_PALE, on(0, 0.025, 0), [0, -a, 0]);
  }
  const flat = (g: THREE.BufferGeometry) => g.rotateX(-Math.PI / 2);
  put(kit.glow, flat(new THREE.RingGeometry(1.6, 1.8, 48)), "#e6d596", on(0, 0.025, 0));
  put(kit.glow, flat(new THREE.RingGeometry(ring - 0.62, ring - 0.55, 56)), LAWN_PALE, on(0, 0.025, 0));
  // the dais the whale sings to: low enough to walk onto without a step
  put(kit.matte, standing(new THREE.CylinderGeometry(1.25, 1.35, 0.07, 7), 0.07), STONE, on(0, 0, 0));
  // a crescent set into it, and the seven stars of the stones
  put(kit.glow, flat(new THREE.RingGeometry(0.42, 0.62, 28, 1, 0.9, Math.PI * 1.35)), STAR, on(0, 0.085, 0));
  for (const { a } of SUMMIT_STONES) put(kit.glow, flat(new THREE.CircleGeometry(0.06, 8)), STAR, on(Math.cos(a) * 1.02, 0.085, Math.sin(a) * 1.02));
}

/** Crystal shards that hang in the air over the summit's stones, turning slowly */
function summitShards() {
  const parts: Parts = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2;
    const reach = isle("summit").r - 0.3 + (k % 2) * 0.7;
    put(
      parts,
      new THREE.OctahedronGeometry(0.13, 0),
      [SILVER, VIOLET, AQUA][k % 3],
      [Math.cos(a) * reach, 3 + hash(k, 31) * 1.1, Math.sin(a) * reach],
      [hash(k, 32), a, hash(k, 33)],
      [1, 2.2 + hash(k, 34), 1],
    );
  }
  return mergeParts(parts);
}

// ── on the water ─────────────────────────────────────────────────────────────

/** Lily pads lying on the star sea round the islands and where you arrive, some with a bud alight */
function lilyPads(kit: Kit) {
  const pad = (k: number, x: number, z: number) => {
    // not under the way home or on the spot you land on
    if (Math.hypot(x - DREAM_HOME.x, z - DREAM_HOME.z) < 1.8 || Math.hypot(x - DREAM_ARRIVAL.x, z - DREAM_ARRIVAL.z) < 1.5) return;
    const size = 0.28 + hash(k, 91) * 0.3;
    const turn = hash(k, 92) * 6;
    put(kit.matte, new THREE.CircleGeometry(size, 9, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2), k % 2 ? "#2b2a62" : "#3a3477", [x, 0.03, z], [0, turn, 0]);
    if (k % 3 === 0) put(kit.glow, new THREE.OctahedronGeometry(0.07, 0), k % 2 ? PINK : STAR, [x, 0.1, z], [0, turn, 0], [1, 1.3, 1]);
  };
  let k = 0;
  const cluster = (cx: number, cz: number, near: number, far: number, count: number) => {
    for (let n = 0; n < count; n++, k++) {
      if (!thin(k)) continue;
      const a = hash(k, 93) * Math.PI * 2;
      const reach = near + hash(k, 94) * (far - near);
      pad(k, cx + Math.cos(a) * reach, cz + Math.sin(a) * reach);
    }
  };
  for (const i of ISLES) cluster(i.x, i.z, i.r * 0.75 + 0.8, i.r + 4, 9);
  cluster(DREAM_ARRIVAL.x, DREAM_ARRIVAL.z, 2, 8, 10);
}

/**
 * Motes of light lifting off the islands and the open sea: where each starts
 * and how far it rises before it fades (dream-sea.tsx's SeaStars draws them
 * with the sea's own stars, as one cloud of points).
 */
export function dreamMotes() {
  const motes: { x: number; y: number; z: number; rise: number }[] = [];
  const every = quality.tier === "minimal" ? 3 : 1;
  let k = 0;
  const add = (x: number, y: number, z: number) => {
    if (k++ % every === 0) motes.push({ x, y, z, rise: 1.6 + hash(k, 101) * 2.4 });
  };
  for (const i of ISLES) {
    for (let n = 0; n < Math.round(i.r * 9); n++) {
      const rad = Math.sqrt(hash(k, 102)) * i.r * 1.2;
      const a = hash(k, 103) * Math.PI * 2;
      // off the lawn, or (past its edge) from anywhere below it
      add(i.x + Math.cos(a) * rad, rad < i.r ? i.top + 0.1 : hash(k, 104) * i.top, i.z + Math.sin(a) * rad);
    }
  }
  for (let n = 0; n < 70; n++) {
    add((hash(k, 105) * 2 - 1) * DREAM_BOUNDS.x, 0.1, THREE.MathUtils.lerp(DREAM_BOUNDS.zMin, DREAM_BOUNDS.zMax, hash(k, 106)));
  }
  return motes;
}

// ── drawn ────────────────────────────────────────────────────────────────────

/** Bare circles on each island (relative to its centre): its dream thing, and what lies round it */
const CLEAR: Record<DreamIsle["thing"], readonly Clear[]> = {
  shell: [[0, -0.6, 2.2]],
  teacup: [
    [TEACUP.x - isle("teacup").x, TEACUP.z - isle("teacup").z, TEACUP.saucer.r + 0.15],
    [2.9, 1.7, 0.6],
  ],
  tree: [[-0.9, 0, 1.5]],
  moon: [[-0.9, 0, 0.45]],
  summit: [[0, 0, 1.9]],
};

function buildKit() {
  const kit: Kit = { matte: [], glow: [], halo: [] };
  for (const i of ISLES) {
    isleBody(kit, i);
    isleRim(kit, i);
    isleCharms(kit, i);
    isleGrowth(kit, i, CLEAR[i.thing]);
    isleLight(kit, i);
    if (floats(i)) isleDrift(kit, i);
  }
  shellThings(kit);
  teacupThings(kit);
  treeThings(kit);
  moonThings(kit);
  summitThings(kit);
  lilyPads(kit);
  return kit;
}

/**
 * Lit matter in the dream gives off a share of its own colour, so nothing here
 * waits on a lamp: the sea has none to speak of. (Emissive can't do it: that
 * is one colour for the whole mesh, and this mesh is every colour.)
 */
function dreamMatter() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * 0.3;",
    );
  };
  return material;
}

/** Everything above as three geometries, one per material */
function bake() {
  const kit = buildKit();
  const baked = { matte: mergeParts(kit.matte), glow: mergeParts(kit.glow), halo: mergeParts(kit.halo) };
  return { ...baked, dispose: () => Object.values(baked).forEach((g) => g.dispose()) };
}

export function DreamIsles() {
  const baked = useBuilt(bake);
  const shards = useBuilt(summitShards);
  const matter = useBuilt(dreamMatter);
  const light = useBuilt(() => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
  const water = useBuilt(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        toneMapped: false,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
  );
  const haloMesh = useRef<THREE.Mesh>(null);
  const shardMesh = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // the light on the water breathes
    const lit = haloMesh.current?.material as THREE.MeshBasicMaterial | undefined;
    if (lit) lit.opacity = 0.8 + Math.sin(t * 0.7) * 0.2;
    if (shardMesh.current) {
      shardMesh.current.rotation.y = t * 0.08;
      shardMesh.current.position.y = isle("summit").top + Math.sin(t * 0.5) * 0.12;
    }
  });
  const summit = isle("summit");
  return (
    <>
      <mesh geometry={baked.matte} material={matter} receiveShadow />
      <mesh geometry={baked.glow} material={light} />
      <mesh ref={haloMesh} geometry={baked.halo} material={water} />
      <mesh ref={shardMesh} geometry={shards} material={light} position={[summit.x, summit.top, summit.z]} />
    </>
  );
}
