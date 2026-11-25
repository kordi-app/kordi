"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { skyAt } from "../../engine/day-night";
import { MIRROR_STONE, PLINTH, STANDING_STONES, STATUE, STATUE_WAKE_SECONDS, statueRuntime, type StandingStone } from "../../engine/statue";
import { quality } from "../quality";
import { mergeParts, paint, useBuilt } from "./shared";

/*
 * The dreaming statue in its ring of standing stones (engine/statue.ts): an
 * old stone Kordi asleep on a plinth, hugging a small harp, and the mirror
 * stone in front of it.
 *
 * Everything that never moves — stone, moss, the leaves and flowers on the
 * ground — is one merged mesh (one draw call, one material): age is painted
 * into its vertex colours (rain streaks, lichen, moss where water settles)
 * rather than drawn with more materials. Everything that glows without
 * fading — the mirror stone's filling rim, the marks on the standing stones,
 * the statue's opened eyes, the "z"s — shares a second; what glows *softly*
 * (the veil of light off the rim, the beam on the statue, fireflies) is
 * additive and kept to a few small meshes.
 */

const STONE = "#9d998f";
const STONE_DARK = "#7d7970";
const STONE_PALE = "#b9b6ad";
const CARVED = "#4c4841";
const STREAK = "#615d55";
const LICHEN_PALE = "#c6cbae";
const LICHEN_GOLD = "#b9a76c";
const MOSS = "#6f8a4e";
const MOSS_DARK = "#56733f";
const MOSS_BRIGHT = "#8ca25a";
const MIRROR = "#cfd3dc";
const MIRROR_SKY = "#eef2ff";
const DREAM_GLOW = "#ffe9a8";
const LEAF_COLORS = ["#c8873a", "#b5602b", "#d9a441", "#8f5a2a", "#a9a04a"];
const PETAL_COLORS = ["#ffffff", "#e8dcff", "#fff3c4", "#ffd9e6"];

const RICH = quality.tier !== "minimal";
/** How much lies about the clearing, by tier: [high, low, minimal] */
const byTier = (high: number, low: number, minimal: number) => (quality.tier === "high" ? high : quality.tier === "low" ? low : minimal);

/** The figure is modelled at twice Kordi's model size, then grown by this: it should look over the head of whoever sits before it */
const FIGURE_SCALE = 1.3;
/** The middle of its bean body above the plinth's top, before FIGURE_SCALE */
const BODY_Y = 1.3;
/** The body: a capsule this long between its round ends (radius 1), squashed front to back, nodding forward */
const BODY = { half: 0.42, depth: 0.9, nod: 0.1 };
/** Where its eyes are on the front of the body (above the plinth's top, before FIGURE_SCALE) */
const EYES: readonly [x: number, y: number, z: number][] = [
  [-0.36, BODY_Y + 0.55, 0.84],
  [0.36, BODY_Y + 0.55, 0.84],
];
/** The harp's strings, across its frame: [x, length, y], before it is laid in the statue's lap. The third snapped long ago */
const HARP_STRINGS: readonly [x: number, length: number, y: number][] = [
  [-0.2, 0.8, -0.07],
  [-0.08, 0.68, -0.02],
  [0.04, 0.56, 0.03],
  [0.16, 0.44, 0.08],
  [0.27, 0.32, 0.13],
];
const SNAPPED_STRING = 2;
/** The mirror stone's rim, where its light fills in a ring round whoever sits on it (their body hides the middle) */
const RIM = { inner: MIRROR_STONE.r * 0.72, outer: MIRROR_STONE.r * 0.9, segments: 48 };

const hash = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const lattice = (x: number, y: number, z: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/** Smooth noise, 0–1, the same everywhere it is asked (so parts that touch weather alike) */
function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const ease = (t: number) => t * t * (3 - 2 * t);
  const u = ease(x - xi);
  const v = ease(y - yi);
  const w = ease(z - zi);
  const mix = THREE.MathUtils.lerp;
  const face = (k: number) =>
    mix(mix(lattice(xi, yi, zi + k), lattice(xi + 1, yi, zi + k), u), mix(lattice(xi, yi + 1, zi + k), lattice(xi + 1, yi + 1, zi + k), u), v);
  return mix(face(0), face(1), w);
}

interface Wear {
  /** moss where rain settles (upward faces, the shaded north side, the foot), 0–1 */
  moss?: number;
  /** pale and gold lichen blotches, 0–1 */
  lichen?: number;
  /** dark runs down the steep faces, 0–1 */
  streaks?: number;
}

const scratch = { color: new THREE.Color(), tint: new THREE.Color() };

/**
 * Paints a stone part old: mottled, rain-streaked down its steep faces,
 * blotched with lichen, mossy where water settles. All in vertex colours, so
 * the whole clearing still draws with one material. `y = 0` is taken as the
 * part's foot, where moss gathers thickest.
 */
function weather(geometry: THREE.BufferGeometry, base: string, seed: number, { moss = 0.5, lichen = 0.5, streaks = 0.6 }: Wear = {}) {
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const colors = new Float32Array(position.count * 3);
  const { color, tint } = scratch;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + seed * 3.7;
    const y = position.getY(i);
    const z = position.getZ(i) + seed * 1.9;
    const up = Math.max(0, normal.getY(i));
    const north = Math.max(0, -normal.getZ(i));
    color.set(base).multiplyScalar(0.88 + noise(x * 1.7, y * 1.7, z * 1.7) * 0.24);
    // rain runs down the same lines for years: noise stretched tall
    const run = noise(x * 5.5, y * 0.4, z * 5.5);
    color.lerp(tint.set(STREAK), THREE.MathUtils.smoothstep(run, 0.58, 0.82) * (1 - up) * streaks);
    const blotch = noise(x * 3.1 + 40, y * 3.1, z * 3.1);
    color.lerp(tint.set(noise(x * 0.9, y * 0.9 + 9, z * 0.9) > 0.5 ? LICHEN_PALE : LICHEN_GOLD), THREE.MathUtils.smoothstep(blotch, 0.64, 0.78) * lichen * 0.7);
    const patch = noise(x * 2.3 + 80, y * 2.3, z * 2.3);
    const foot = Math.max(0, 1 - Math.abs(y) / 0.5) * 0.45;
    const mossy = THREE.MathUtils.smoothstep(up * 0.75 + north * 0.3 + patch * 0.65 + foot, 0.95, 1.2) * moss;
    color.lerp(tint.set(patch > 0.62 ? MOSS_BRIGHT : patch > 0.4 ? MOSS : MOSS_DARK), mossy);
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** A clump of moss: a squashed, rough ball */
const moss = (x: number, y: number, z: number, r: number, seed: number) =>
  paint(
    new THREE.IcosahedronGeometry(r, 1).scale(1, 0.34 + hash(seed, 8) * 0.14, 0.9).rotateY(hash(seed, 7) * 3).translate(x, y, z),
    hash(seed, 9) > 0.66 ? MOSS_BRIGHT : hash(seed, 9) > 0.33 ? MOSS : MOSS_DARK,
  );

const lathe = (points: number[][], segments: number) =>
  new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments, Math.PI / 8);

/**
 * Pulls a round turned shape out to an octagon (a face square on to +z),
 * keeping the vertices along each face: weathering is painted per vertex, and
 * a face with only its corners would take none.
 */
function octagonal(geometry: THREE.BufferGeometry) {
  const position = geometry.attributes.position;
  const step = Math.PI / 4;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const angle = Math.atan2(x, z);
    const off = angle - Math.round(angle / step) * step;
    const reach = Math.cos(step / 2) / Math.cos(off);
    position.setXYZ(i, x * reach, position.getY(i), z * reach);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A thin strip laid along a path over a surface (each point with the
 * surface's normal there), tapering to nothing at both ends: a crack.
 */
function ribbon(points: THREE.Vector3[], normals: THREE.Vector3[], width: number) {
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const last = points.length - 1;
  const edges = points.map((p, i) => {
    tangent.subVectors(points[Math.min(i + 1, last)], points[Math.max(i - 1, 0)]);
    side.crossVectors(tangent, normals[i]).normalize().multiplyScalar((width / 2) * Math.sin((i / last) * Math.PI) ** 0.6);
    return [p.clone().sub(side), p.clone().add(side)] as const;
  });
  const positions: number[] = [];
  const facing: number[] = [];
  for (let i = 0; i < last; i++) {
    const [l0, r0] = edges[i];
    const [l1, r1] = edges[i + 1];
    for (const v of [l0, r0, l1, r0, r1, l1]) {
      positions.push(v.x, v.y, v.z);
      facing.push(normals[i].x, normals[i].y, normals[i].z);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(facing, 3));
  return geometry;
}

/** A crack wandering down the statue's body from height h0 to h1 (measured from its middle), starting at angle theta round it (0: the front) */
function bodyCrack(theta: number, h0: number, h1: number, seed: number) {
  const points: THREE.Vector3[] = [];
  const normals: THREE.Vector3[] = [];
  const steps = 9;
  let angle = theta;
  for (let i = 0; i <= steps; i++) {
    const h = THREE.MathUtils.lerp(h0, h1, i / steps);
    // on the round ends the surface curves in towards the axis
    const dy = Math.sign(h) * Math.max(0, Math.abs(h) - BODY.half);
    const around = Math.sqrt(Math.max(0, 1 - dy * dy));
    const n = new THREE.Vector3(Math.sin(angle) * around, dy, Math.cos(angle) * around);
    normals.push(n);
    points.push(n.clone().multiplyScalar(1.012).add(new THREE.Vector3(0, h - dy, 0)));
    angle += (hash(seed, i) - 0.5) * 0.3;
  }
  return paint(ribbon(points, normals, 0.07).scale(1, 1, BODY.depth).rotateX(BODY.nod).translate(0, BODY_Y, 0), CARVED);
}

/** A flat star with this many points, facing +z */
function starShape(points: number, outer: number, inner: number) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2;
    if (i === 0) shape.moveTo(Math.sin(a) * r, Math.cos(a) * r);
    else shape.lineTo(Math.sin(a) * r, Math.cos(a) * r);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** A fallen leaf lying flat, folded a little along its rib (so its halves catch the light differently) */
function leafGeometry(length: number, width: number) {
  const fold = width * 0.3;
  const geometry = new THREE.BufferGeometry();
  // tail, tip, right / tip, tail, left: both halves face up
  const positions = [0, 0, -length, 0, 0, length, width, fold, 0, 0, 0, length, 0, 0, -length, -width, fold, 0];
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// --- the plinth and the statue ----------------------------------------------------

/** The plinth's upright faces: between its stepped foot and its cornice */
const PLINTH_BAND = { y0: 0.2, y1: PLINTH.top - 0.24 };
/** How far out a carving on one of the plinth's eight faces sits */
const PLINTH_FACE = PLINTH.r * Math.cos(Math.PI / 8) + 0.012;

/** Lays a carving (made flat, facing +z, about the origin) on the k-th face of the plinth (0: the front) */
const onPlinth = (g: THREE.BufferGeometry, k: number, y = (PLINTH_BAND.y0 + PLINTH_BAND.y1) / 2) =>
  g.translate(0, y, PLINTH_FACE).rotateY((k * Math.PI) / 4);

function plinthParts() {
  const parts: THREE.BufferGeometry[] = [];
  // a stepped foot, eight upright faces, a cornice under the statue (the lowest step stands a little proud of what you bump into)
  const profile = [
    [PLINTH.r + 0.2, 0],
    [PLINTH.r + 0.2, 0.1],
    [PLINTH.r + 0.09, 0.14],
    [PLINTH.r + 0.09, PLINTH_BAND.y0 - 0.02],
    [PLINTH.r, PLINTH_BAND.y0],
    [PLINTH.r, (PLINTH_BAND.y0 * 2 + PLINTH_BAND.y1) / 3],
    [PLINTH.r, (PLINTH_BAND.y0 + PLINTH_BAND.y1 * 2) / 3],
    [PLINTH.r, PLINTH_BAND.y1],
    [PLINTH.r + 0.1, PLINTH_BAND.y1 + 0.05],
    [PLINTH.r + 0.1, PLINTH.top - 0.08],
    [PLINTH.r - 0.1, PLINTH.top],
    [PLINTH.r * 0.5, PLINTH.top],
    [0, PLINTH.top],
  ];
  parts.push(weather(octagonal(lathe(profile, 24)), STONE_DARK, 5, { moss: 0.9, lichen: 0.7 }));

  const mid = (PLINTH_BAND.y0 + PLINTH_BAND.y1) / 2;
  const width = PLINTH.r * 2 * Math.sin(Math.PI / 8) - 0.34;
  const height = PLINTH_BAND.y1 - PLINTH_BAND.y0 - 0.1;
  for (let k = 0; k < 8; k++) {
    // each face: a sunk panel, drawn by its incised border
    for (const side of [-1, 1]) {
      parts.push(paint(onPlinth(new THREE.PlaneGeometry(width, 0.018).translate(0, (side * height) / 2, 0), k), CARVED));
      parts.push(paint(onPlinth(new THREE.PlaneGeometry(0.018, height).translate((side * width) / 2, 0, 0), k), CARVED));
    }
    if (k === 0) continue;
    // round the sides and back, stars and moons by turns, worn pale
    if (k % 2 === 1) parts.push(paint(onPlinth(starShape(4, 0.15, 0.055), k), STONE_PALE));
    else parts.push(paint(onPlinth(new THREE.RingGeometry(0.085, 0.14, 12, 1, 0.5, Math.PI * 1.25), k), STONE_PALE));
  }
  // the front face: what it dreams of, carved as a tune — five lines and the first seven notes of the music box's song
  for (let line = 0; line < 5; line++) {
    parts.push(paint(onPlinth(new THREE.PlaneGeometry(width - 0.16, 0.014), 0, mid - 0.14 + line * 0.07), CARVED));
  }
  // C C G G A A G, low on the stave to high (a step of the scale is half a line's spacing)
  [0, 0, 4, 4, 5, 5, 4].forEach((degree, i) => {
    const x = (i - 3) * ((width - 0.3) / 6);
    parts.push(paint(onPlinth(new THREE.CircleGeometry(0.036, 8).scale(1.25, 1, 1).translate(x, -0.175 + degree * 0.035, 0.004), 0, mid), STONE_PALE));
  });
  return parts;
}

/** Kordi, sitting: the bean body nodding forward in sleep, feet out in front, the harp in its lap (on the plinth's top at y = 0, before FIGURE_SCALE) */
function figureParts() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(
    weather(
      new THREE.CapsuleGeometry(1, BODY.half * 2, 8, 20, 3).scale(1, 1, BODY.depth).rotateX(BODY.nod).translate(0, BODY_Y, 0),
      STONE,
      1,
      { moss: 0.85, lichen: 0.8, streaks: 0.9 },
    ),
  );
  for (const side of [-1, 1]) {
    parts.push(
      weather(new THREE.SphereGeometry(0.34, 10, 8).scale(1, 0.62, 1.35).translate(side * 0.5, 0.2, 1.05), STONE_DARK, 2 + side, { moss: 0.7 }),
    );
    // arms wrapped round the harp
    parts.push(
      weather(
        new THREE.SphereGeometry(0.3, 10, 8)
          .scale(1.7, 0.72, 0.8)
          .rotateY(side * -0.75)
          .translate(side * 0.7, BODY_Y - 0.12, 0.78),
        STONE,
        4 + side,
        { moss: 0.6, streaks: 0.3 },
      ),
    );
    // eyes closed: a little carved arc each, curving down
    const [ex, ey, ez] = EYES[side < 0 ? 0 : 1];
    parts.push(paint(new THREE.TorusGeometry(0.13, 0.032, 4, 8, Math.PI).rotateZ(Math.PI).rotateX(-0.2).translate(ex, ey + 0.05, ez + 0.02), CARVED));
    // and a round cheek under each, raised and worn smooth
    parts.push(paint(new THREE.SphereGeometry(0.1, 8, 6).scale(1, 0.8, 0.3).translate(side * 0.58, BODY_Y + 0.3, 0.76), STONE_PALE));
  }
  // whatever it dreams of, it is smiling
  parts.push(paint(new THREE.TorusGeometry(0.085, 0.024, 4, 8, Math.PI).rotateZ(Math.PI).rotateX(-0.12).translate(0, BODY_Y + 0.4, 0.935), CARVED));
  // frost has been at it: one crack from the crown down past an eye, a shorter one low on the other side
  parts.push(bodyCrack(-0.5, 1.36, 0.1, 3), bodyCrack(0.95, -0.2, -1.05, 7), bodyCrack(2.4, 1.1, -0.3, 11));

  // the small harp in its lap: a curved neck ending in a scroll, a pillar, a soundboard with its holes, the strings
  const harp: [THREE.BufferGeometry, string][] = [
    [new THREE.TorusGeometry(0.42, 0.065, 5, 12, Math.PI * 0.75).rotateZ(Math.PI * 0.3).translate(0.06, 0.2, 0), STONE_PALE],
    [new THREE.TorusGeometry(0.075, 0.04, 4, 8).translate(0.44, 0.33, 0), STONE_PALE],
    [new THREE.CylinderGeometry(0.06, 0.07, 0.95, 6).translate(-0.34, -0.1, 0), STONE_PALE],
    [new THREE.CylinderGeometry(0.085, 0.085, 0.06, 6).translate(-0.34, 0.36, 0), STONE_PALE],
    [new THREE.BoxGeometry(0.72, 0.12, 0.2).rotateZ(0.5).translate(0.02, -0.48, 0), STONE_PALE],
    ...[-0.16, 0.02, 0.2].map((x): [THREE.BufferGeometry, string] => [new THREE.CircleGeometry(0.028, 6).translate(x, -0.55 + (x + 0.16) * 0.55, 0.108), CARVED]),
  ];
  HARP_STRINGS.forEach(([x, length, y], i) => {
    if (i !== SNAPPED_STRING) harp.push([new THREE.BoxGeometry(0.025, length, 0.025).translate(x, y, 0), STONE_PALE]);
    // the snapped one: a stub left at each end
    else for (const end of [-1, 1]) harp.push([new THREE.BoxGeometry(0.025, 0.12, 0.025).translate(x, y + end * (length / 2 - 0.06), 0), STONE_PALE]);
  });
  for (const [part, color] of harp) parts.push(paint(inLap(part), color));

  // moss: it has sat here a long time
  parts.push(
    moss(-0.35, BODY_Y + 1.36, -0.1, 0.55, 1),
    moss(0.3, BODY_Y + 1.4, 0.15, 0.3, 5),
    moss(0.72, BODY_Y + 0.72, -0.25, 0.4, 2),
    moss(-0.92, BODY_Y + 0.05, 0.25, 0.26, 6),
    moss(0.5, 0.42, 1.2, 0.2, 7),
  );
  return parts;
}

/** Where the harp lies: tipped back in the statue's lap */
const inLap = (g: THREE.BufferGeometry) => g.rotateX(-0.18).translate(0, BODY_Y - 0.05, 1.05);

// --- the standing stones -----------------------------------------------------------

/** A standing stone's shape: a six-sided slab, narrowing upward, a broad face turned to the statue */
const SLAB = { top: 0.6, bottom: 1.08, depth: 0.66, sunk: 0.1 };

/** Stands something made in a stone's own space (its foot at the origin, its carved face to +z) where that stone stands */
function raise(g: THREE.BufferGeometry, stone: StandingStone) {
  const x = stone.x - STATUE.x;
  const z = stone.z - STATUE.z;
  // facing the statue, give or take: they were set by eye, and have shifted since
  const facing = Math.atan2(-x, -z) + (stone.turn / Math.PI - 0.5) * 0.5;
  return g.rotateZ(stone.lean).rotateY(facing).translate(x, 0, z);
}

/** Lays a carving (made flat, facing +z, about the origin) on a stone's inner face, this far up it and this proud of it */
function onStone(g: THREE.BufferGeometry, stone: StandingStone, up: number, proud: number) {
  const apothem = Math.cos(Math.PI / 6) * SLAB.depth * stone.r;
  const slant = Math.atan(((SLAB.bottom - SLAB.top) * apothem) / stone.height);
  const z = THREE.MathUtils.lerp(SLAB.bottom, SLAB.top, up) * apothem;
  return raise(g.rotateX(-slant).translate(0, up * stone.height - SLAB.sunk, z + proud), stone);
}

/** Hewn by hand, then centuries of frost: every corner a little out of true, the top broken off at a slant */
function standingStone(stone: StandingStone, i: number) {
  const g = new THREE.CylinderGeometry(stone.r * SLAB.top, stone.r * SLAB.bottom, stone.height, 6, 5).rotateY(Math.PI / 6);
  const position = g.attributes.position;
  const top = stone.height / 2;
  const slope = (hash(i, 41) - 0.5) * 0.9;
  for (let v = 0; v < position.count; v++) {
    const x = position.getX(v);
    const y = position.getY(v);
    // the same corner is several vertices (side and cap): move them together
    const corner = Math.round(x * 40) * 7 + Math.round(y * 40) * 131 + Math.round(position.getZ(v) * 40) * 1013 + i * 17;
    if (y < -top + 1e-3) continue;
    // sideways and up-and-down only: the face that is carved stays flat
    position.setX(v, x + (hash(corner, 1) - 0.5) * stone.r * 0.2);
    position.setY(v, y > top - 1e-3 ? y - hash(corner, 2) * stone.r * 0.3 - x * slope : y + (hash(corner, 3) - 0.5) * 0.16);
  }
  g.computeVertexNormals();
  g.scale(1, 1, SLAB.depth).translate(0, stone.height / 2 - SLAB.sunk, 0);
  return raise(weather(g, i % 3 === 0 ? STONE_DARK : i % 3 === 1 ? STONE : STONE_PALE, 20 + i, { moss: 0.9, lichen: 0.9 }), stone);
}

/**
 * Stone k's mark: an old ring-and-cup carving, with k + 1 cups under the
 * ring. Round the circle they count up one to eight, like a scale — and they
 * are what lights, one stone after another, as the mirror stone fills.
 */
function glyph(k: number) {
  const parts: THREE.BufferGeometry[] = [new THREE.RingGeometry(0.11, 0.16, 14).translate(0, 0.2, 0)];
  const cups = k + 1;
  for (let c = 0; c < cups; c++) {
    const row = Math.floor(c / 4);
    const inRow = Math.min(4, cups - row * 4);
    parts.push(new THREE.CircleGeometry(0.04, 8).translate(((c % 4) - (inRow - 1) / 2) * 0.105, -0.04 - row * 0.11, 0));
  }
  return parts;
}

/** How far up a stone its mark is carved */
const GLYPH_UP = 0.52;

// --- the ground ---------------------------------------------------------------------

const MIRROR_AT = { x: MIRROR_STONE.x - STATUE.x, z: MIRROR_STONE.z - STATUE.z };
/** The old path's stepping stones run from the mirror stone out through the gap in the ring */
const PATH = { from: MIRROR_AT.z + MIRROR_STONE.r + 0.75, step: 1.25, count: 4 };

/** Clear ground: not under the plinth, the mirror stone, a standing stone or the path */
function clearGround(x: number, z: number, margin = 0.25) {
  if (Math.hypot(x, z) < PLINTH.r + 0.2 + margin) return false;
  if (Math.hypot(x - MIRROR_AT.x, z - MIRROR_AT.z) < MIRROR_STONE.r + 0.08 + margin) return false;
  if (Math.abs(x) < 0.7 + margin && z > PATH.from - 0.6 && z < PATH.from + PATH.step * PATH.count) return false;
  return STANDING_STONES.every((s) => Math.hypot(x - (s.x - STATUE.x), z - (s.z - STATUE.z)) > s.r + margin);
}

/** A flat worn stone set in the ground (not a step: it stands no higher than the grass's roots) */
const cobble = (x: number, z: number, r: number, seed: number) =>
  weather(
    new THREE.CylinderGeometry(r, r * 1.1, 0.06, 6 + (seed % 2))
      .scale(1, 1, 0.68 + hash(seed, 1) * 0.3)
      .rotateY(hash(seed, 2) * Math.PI)
      .translate(x, 0.012, z),
    hash(seed, 3) > 0.5 ? STONE : STONE_PALE,
    60 + seed,
    { moss: 0.45, lichen: 0.6, streaks: 0 },
  );

function groundParts() {
  const parts: THREE.BufferGeometry[] = [];
  // an old paved ring round the plinth, some of its stones long gone…
  const ring = 13;
  for (let i = 0; i < ring; i++) {
    if (i === 4 || i === 9) continue;
    const a = (i / ring) * Math.PI * 2 + 0.2;
    const r = PLINTH.r + 0.85 + (hash(i, 51) - 0.5) * 0.2;
    parts.push(cobble(Math.sin(a) * r, Math.cos(a) * r, 0.36 + hash(i, 52) * 0.14, i));
  }
  // …and stepping stones leading in through the gap
  for (let i = 0; i < PATH.count; i++) {
    parts.push(cobble((hash(i, 53) - 0.5) * 0.5, PATH.from + i * PATH.step, 0.46 + hash(i, 54) * 0.12, 20 + i));
  }

  // moss at the foot of the plinth and of every stone, and on the tops of the tall ones
  parts.push(moss(-1.15, PLINTH.top + 0.02, 1.0, 0.5, 3), moss(1.25, PLINTH.top + 0.02, -0.8, 0.55, 4), moss(1.3, PLINTH.top + 0.02, 0.9, 0.26, 12));
  for (let i = 0; i < 6; i++) {
    const a = hash(i, 55) * Math.PI * 2;
    parts.push(moss(Math.sin(a) * (PLINTH.r + 0.25), 0.04, Math.cos(a) * (PLINTH.r + 0.25), 0.3 + hash(i, 56) * 0.25, 13 + i));
  }
  STANDING_STONES.forEach((stone, i) => {
    const x = stone.x - STATUE.x;
    const z = stone.z - STATUE.z;
    if (i % 2 === 0) parts.push(raise(moss(0, stone.height - SLAB.sunk - 0.06, 0, stone.r * 0.62, 10 + i), stone));
    parts.push(moss(x + 0.3, 0.05, z + 0.35, stone.r * 0.8, 30 + i), moss(x - 0.4, 0.04, z + 0.1, stone.r * 0.5, 40 + i));
    if (!RICH) return;
    // a fern or two in its lee: fronds arching out from one root
    const fx = x + Math.sin(hash(i, 57) * 6) * (stone.r + 0.35);
    const fz = z + Math.cos(hash(i, 57) * 6) * (stone.r + 0.35);
    const fronds = 5 + (i % 3);
    for (let f = 0; f < fronds; f++) {
      const frond = leafGeometry(0.34 + hash(i * 9 + f, 58) * 0.16, 0.085)
        .translate(0, 0, 0.36)
        .rotateX(-0.5 - hash(i * 9 + f, 59) * 0.4)
        .rotateY((f / fronds) * Math.PI * 2 + hash(i, 60))
        .translate(fx, 0.03, fz);
      parts.push(paint(frond, f % 2 === 0 ? MOSS_DARK : MOSS));
    }
    // and on a few, a cluster of little brown mushrooms at the foot
    if (i % 3 !== 1) return;
    for (let m = 0; m < 3; m++) {
      const mx = x - 0.25 + m * 0.2 + stone.r * 0.6;
      const mz = z + stone.r + 0.2 + hash(i * 5 + m, 61) * 0.2;
      const tall = 0.1 + hash(i * 5 + m, 62) * 0.1;
      parts.push(paint(new THREE.CylinderGeometry(0.018, 0.024, tall, 5).translate(mx, tall / 2, mz), "#efe6d2"));
      parts.push(paint(new THREE.SphereGeometry(0.07, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(mx, tall - 0.01, mz), m === 1 ? "#b9773f" : "#a35a34"));
    }
  });

  // fallen leaves: blown into drifts against the stones and the plinth, a scatter between
  const leaves = byTier(96, 56, 18);
  for (let i = 0; i < leaves; i++) {
    let x: number;
    let z: number;
    const where = hash(i, 71);
    if (where < 0.4) {
      const stone = STANDING_STONES[Math.floor(hash(i, 72) * STANDING_STONES.length)];
      const a = hash(i, 73) * Math.PI * 2;
      const r = stone.r + 0.3 + hash(i, 74) * 0.9;
      x = stone.x - STATUE.x + Math.sin(a) * r;
      z = stone.z - STATUE.z + Math.cos(a) * r;
    } else {
      const a = hash(i, 73) * Math.PI * 2;
      const r = where < 0.6 ? PLINTH.r + 0.5 + hash(i, 74) * 1.1 : 2.6 + Math.sqrt(hash(i, 74)) * 6;
      x = Math.sin(a) * r;
      z = Math.cos(a) * r;
    }
    if (!clearGround(x, z, 0.12)) continue;
    const leaf = leafGeometry(0.11 + hash(i, 75) * 0.07, 0.06 + hash(i, 76) * 0.03)
      .rotateX((hash(i, 77) - 0.5) * 0.5)
      .rotateY(hash(i, 78) * Math.PI * 2)
      .translate(x, 0.035 + hash(i, 79) * 0.03, z);
    parts.push(paint(leaf, LEAF_COLORS[Math.floor(hash(i, 80) * LEAF_COLORS.length)]));
  }
  // a few have settled on the plinth, at the statue's feet
  for (let i = 0; i < 5; i++) {
    const a = (hash(i, 81) - 0.5) * 2.2;
    const r = PLINTH.r - 0.28 - hash(i, 82) * 0.2;
    const leaf = leafGeometry(0.13, 0.07).rotateY(hash(i, 83) * 6).translate(Math.sin(a) * r, PLINTH.top + 0.02, Math.cos(a) * r);
    parts.push(paint(leaf, LEAF_COLORS[i % LEAF_COLORS.length]));
  }

  // small woodland flowers, in patches: they like the shelter of the ring
  const patches = byTier(9, 6, 3);
  for (let p = 0; p < patches; p++) {
    const a = hash(p, 91) * Math.PI * 2;
    const r = 3.4 + hash(p, 92) * 4.6;
    const petals = PETAL_COLORS[p % PETAL_COLORS.length];
    for (let f = 0; f < 5; f++) {
      const x = Math.sin(a) * r + (hash(p * 7 + f, 93) - 0.5) * 1.3;
      const z = Math.cos(a) * r + (hash(p * 7 + f, 94) - 0.5) * 1.3;
      if (!clearGround(x, z)) continue;
      const tall = 0.14 + hash(p * 7 + f, 95) * 0.14;
      parts.push(paint(new THREE.CylinderGeometry(0.012, 0.016, tall, 4).translate(x, tall / 2, z), MOSS));
      // five petals, opened flat as a little cup; a gold eye
      parts.push(paint(new THREE.CylinderGeometry(0.085, 0.018, 0.035, 5).rotateY(hash(p * 7 + f, 96) * 2).translate(x, tall + 0.015, z), petals));
      parts.push(paint(new THREE.OctahedronGeometry(0.028).translate(x, tall + 0.04, z), "#e9b93c"));
    }
  }
  return parts;
}

/** The mirror stone: a low disc worn smooth as glass, a groove round its rim (which is what fills with light) */
function mirrorParts() {
  const parts: THREE.BufferGeometry[] = [];
  const { x, z } = MIRROR_AT;
  const top = MIRROR_STONE.top;
  // its side is as weathered as anything here…
  parts.push(
    weather(
      new THREE.CylinderGeometry(MIRROR_STONE.r, MIRROR_STONE.r + 0.08, top, 32, 2, true).translate(x, top / 2, z),
      MIRROR,
      50,
      { moss: 1, lichen: 0.5, streaks: 0.4 },
    ),
  );
  // …but its face is polished: it holds a little of the sky, brighter towards one side
  const face = new THREE.CircleGeometry(MIRROR_STONE.r, 40).rotateX(-Math.PI / 2);
  const colors = new Float32Array(face.attributes.position.count * 3);
  for (let i = 0; i < face.attributes.position.count; i++) {
    const sweep = (face.attributes.position.getX(i) * 0.8 - face.attributes.position.getZ(i) * 0.6) / MIRROR_STONE.r;
    scratch.color.set(MIRROR).lerp(scratch.tint.set(MIRROR_SKY), THREE.MathUtils.clamp(0.5 + sweep * 0.6, 0, 1)).toArray(colors, i * 3);
  }
  face.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  parts.push(face.translate(x, top, z));
  const flat = (g: THREE.BufferGeometry, lift: number) => g.rotateX(-Math.PI / 2).translate(x, top + lift, z);
  // the groove, and a finer line inside it
  parts.push(paint(flat(new THREE.RingGeometry(RIM.inner, RIM.outer, 40), 0.006), STONE));
  parts.push(paint(flat(new THREE.RingGeometry(RIM.inner - 0.09, RIM.inner - 0.06, 40), 0.004), STONE));
  // eight notches outside the groove: one for each standing stone
  for (let k = 0; k < 8; k++) {
    parts.push(paint(flat(new THREE.PlaneGeometry(0.035, MIRROR_STONE.r * 0.07).translate(0, MIRROR_STONE.r * 0.95, 0).rotateZ((k / 8) * Math.PI * 2), 0.005), STONE_DARK));
  }
  // and in the middle, under whoever sits, a star cut so fine you only see it at an angle
  parts.push(paint(flat(starShape(8, RIM.inner * 0.72, RIM.inner * 0.3), 0.003), "#dfe3ee"));
  return parts;
}

/** Everything of stone, and everything lying on the ground, in the statue's own space (origin: the ground under the statue; it faces +z) */
function stoneGeometry() {
  const parts: THREE.BufferGeometry[] = [...plinthParts()];
  for (const part of figureParts()) parts.push(part.scale(FIGURE_SCALE, FIGURE_SCALE, FIGURE_SCALE).translate(0, PLINTH.top, 0));
  STANDING_STONES.forEach((stone, i) => {
    parts.push(standingStone(stone, i));
    for (const mark of glyph(i)) parts.push(paint(onStone(mark, stone, GLYPH_UP, 0.014), CARVED));
  });
  parts.push(...mirrorParts(), ...groundParts());
  // some parts are hand-built without texture coordinates, and nothing here is textured
  for (const part of parts) part.deleteAttribute("uv");
  return mergeParts(parts);
}

// --- what glows -----------------------------------------------------------------------

/** The standing stones' marks again, a hair prouder, to be lit: stone by stone, in the order they are drawn */
function glyphLights() {
  const parts: THREE.BufferGeometry[] = [];
  /** how much of the index buffer draws the first k stones' marks */
  const ends: number[] = [];
  let drawn = 0;
  STANDING_STONES.forEach((stone, i) => {
    for (const mark of glyph(i)) {
      drawn += mark.index!.count;
      parts.push(onStone(mark.scale(1.12, 1.12, 1), stone, GLYPH_UP, 0.024));
    }
    ends.push(drawn);
  });
  const geometry = mergeParts(parts);
  return { geometry, ends, dispose: () => geometry.dispose() };
}

/** The harp's strings as they are in the statue's lap, to be lit when it wakes (the snapped one too: in the dream it is whole) */
function stringLights() {
  return mergeParts(HARP_STRINGS.map(([x, length, y]) => inLap(new THREE.BoxGeometry(0.04, length, 0.04).translate(x, y, 0.01))));
}

/** A flat letter z, about `size` tall, facing +z */
function zGeometry(size: number) {
  const s = size / 2;
  const t = size * 0.22;
  const shape = new THREE.Shape();
  shape.moveTo(-s, s);
  shape.lineTo(s, s);
  shape.lineTo(s, s - t);
  shape.lineTo(-s + t * 1.6, -s + t);
  shape.lineTo(s, -s + t);
  shape.lineTo(s, -s);
  shape.lineTo(-s, -s);
  shape.lineTo(-s, -s + t);
  shape.lineTo(s - t * 1.6, s - t);
  shape.lineTo(-s, s - t);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

/** A soft-edged sheet of light: lit down its middle, brightest half-way along, nothing at its sides and far end (colour is brightness) */
function lightSheet(width: number, length: number, strength: number) {
  const sheet = new THREE.PlaneGeometry(width, length, 2, 2);
  // rows of three (left, middle, right), the top row first: lit down the middle, brightest half-way
  const shade = new Float32Array(9 * 3);
  [0, strength * 0.35, 0, 0, strength, 0, 0, 0, 0].forEach((v, k) => shade.fill(v, k * 3, k * 3 + 3));
  sheet.setAttribute("color", new THREE.BufferAttribute(shade, 3));
  return sheet;
}

/** The veil of light that stands on the mirror stone's rim as it fills: a wall round it, fading upward (drawn only as far round as the rim is lit) */
function veilGeometry() {
  const mid = (RIM.inner + RIM.outer) / 2;
  // starting at the back of the stone (towards the statue) and running round the same way as the rim
  const wall = new THREE.CylinderGeometry(mid, mid, 1, RIM.segments, 1, true, Math.PI).translate(0, 0.5, 0);
  const position = wall.attributes.position;
  const shade = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) shade.fill(position.getY(i) < 0.5 ? 1 : 0, i * 3, i * 3 + 3);
  wall.setAttribute("color", new THREE.BufferAttribute(shade, 3));
  return wall;
}

/** Light falling into the clearing through the trees: a few soft sheets slanting down onto the statue */
function beamGeometry() {
  const sheets = byTier(3, 2, 2);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < sheets; i++) {
    const length = 15 + hash(i, 101) * 3;
    parts.push(
      lightSheet(1.5 + hash(i, 102) * 1.4, length, 0.55 + hash(i, 103) * 0.45)
        .translate(0, length / 2 - 2.5, 0)
        // leaning in from the west, and tipped back to face whoever looks from the path
        .rotateZ(0.42 + i * 0.04)
        .rotateX(-0.3)
        .translate(-0.9 + i * 1.1, 0, -0.5 + hash(i, 104) * 1.2),
    );
  }
  return mergeParts(parts);
}

/** A round soft dot, for fireflies */
function dotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

/** How many "z"s are in the air at once, and how long each takes to drift up and away */
const Z_COUNT = quality.tier === "minimal" ? 2 : 3;
const Z_SECONDS = 4.2;
const Z_RISE = 2.3;
const EYES_OPEN_SECONDS = 0.35;
/** The top of its head above the ground */
const HEAD_Y = PLINTH.top + (BODY_Y + 1.42) * FIGURE_SCALE;
/** Sparks rising off the lit part of the mirror stone's rim */
const SPARKS = byTier(12, 10, 6);
/** When it wakes, a ring of light runs out along the ground from the mirror stone as far as the standing stones */
const WAKE_RING = { reach: 7.6, seconds: Math.min(1.1, STATUE_WAKE_SECONDS + 0.2) };
const FIREFLIES = byTier(26, 16, 8);
const DRIFTING_LEAVES = byTier(6, 4, 0);
const SUNBEAM = new THREE.Color("#fff0c4");
const MOONBEAM = new THREE.Color("#b4c6ff");
const FIREFLY = new THREE.Color("#d9ff86");

const additive = (color: THREE.ColorRepresentation) =>
  new THREE.MeshBasicMaterial({
    color,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

export function DreamingStatue() {
  const stone = useBuilt(stoneGeometry);
  const zShape = useBuilt(() => zGeometry(0.42));
  const marks = useBuilt(glyphLights);
  const strings = useBuilt(stringLights);
  const veil = useBuilt(veilGeometry);
  const sparkShape = useBuilt(() => new THREE.OctahedronGeometry(1, 0));
  /** the dream's light: one unlit material for every glowing piece */
  const glow = useBuilt(() => new THREE.MeshBasicMaterial({ color: DREAM_GLOW, toneMapped: false, side: THREE.DoubleSide }));
  /** …and its soft light: the same additive material twice, because the veil and the beam fade separately */
  const veilLight = useBuilt(() => additive(DREAM_GLOW));
  const rim = useRef<THREE.Mesh>(null);
  const fill = useRef<THREE.Mesh>(null);
  const wall = useRef<THREE.Mesh>(null);
  const lit = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const woken = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const motes = useRef<THREE.Group>(null);
  const dummy = useRef(new THREE.Object3D());

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    const { progress, wokenAt } = statueRuntime;
    // the eyes open over a moment (wokenAt is on this same clock: the island's frame writes it)
    const since = now - wokenAt;
    const awake = THREE.MathUtils.clamp(since / EYES_OPEN_SECONDS, 0, 1);

    // the mirror stone's light runs round its rim as you sit (the ring is drawn only so far), and the whole stone lights once it's full
    const round = Math.ceil(progress * RIM.segments);
    if (rim.current) {
      rim.current.visible = round > 0;
      rim.current.geometry.setDrawRange(0, round * 6);
    }
    if (fill.current) fill.current.visible = progress >= 1;
    // a veil of light stands on the lit part of the rim, taller as it fills; awake, it leaps up
    if (wall.current) {
      wall.current.visible = round > 0;
      wall.current.geometry.setDrawRange(0, round * 6);
      wall.current.scale.y = 0.5 + progress * 0.9 + awake * 2;
      (wall.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(now * 6) * 0.06 + awake * 0.08;
    }
    // the standing stones answer: their marks light one after another round the ring, the last as the rim closes
    if (lit.current) {
      const stones = Math.min(marks.ends.length, Math.floor(progress * (marks.ends.length + 0.5)));
      lit.current.visible = stones > 0;
      if (stones > 0) lit.current.geometry.setDrawRange(0, marks.ends[stones - 1]);
    }
    // sparks rise off the lit part of the rim; awake, they fly up and outward
    const s = sparks.current;
    if (s) {
      s.visible = progress > 0;
      if (progress > 0) {
        const d = dummy.current;
        for (let i = 0; i < SPARKS; i++) {
          const k = (now * (0.45 + hash(i, 2) * 0.4) + hash(i, 3)) % 1;
          const angle = Math.PI + hash(i, 1) * progress * Math.PI * 2;
          const r = (RIM.inner + RIM.outer) / 2 + awake * k * 1.6;
          d.position.set(Math.sin(angle) * r, k * (1.2 + awake * 2.6), Math.cos(angle) * r);
          d.rotation.set(0, now * 2 + i, 0);
          d.scale.setScalar(Math.max(0.001, Math.sin(k * Math.PI) * (0.045 + hash(i, 4) * 0.035)));
          d.scale.y *= 1.8;
          d.updateMatrix();
          s.setMatrixAt(i, d.matrix);
        }
        s.instanceMatrix.needsUpdate = true;
      }
    }
    // the moment it wakes: a ring of light runs out over the grass to the standing stones
    if (ring.current) {
      const k = since / WAKE_RING.seconds;
      ring.current.visible = k > 0 && k < 1;
      if (ring.current.visible) ring.current.scale.setScalar(THREE.MathUtils.lerp(MIRROR_STONE.r, WAKE_RING.reach, 1 - (1 - k) ** 2));
    }
    // its eyes open, and the harp's strings shine
    if (woken.current) woken.current.visible = awake > 0;
    eyes.current?.children.forEach((eye) => eye.scale.setScalar(Math.max(0.001, awake)));
    // "z"s drift up off its head, one after another, while it sleeps
    motes.current?.children.forEach((mote, i) => {
      const k = (now / Z_SECONDS + i / Z_COUNT) % 1;
      // grows as it leaves, shrinks away at the top; gone the moment the statue wakes
      const size = Math.sin(k * Math.PI) ** 0.6 * (0.55 + k * 0.75) * (1 - awake);
      mote.visible = size > 0.01;
      mote.position.set(0.7 + k * 1.1 + Math.sin(k * 7 + i) * 0.18, HEAD_Y + 0.3 + k * Z_RISE, 0.4);
      mote.rotation.z = Math.sin(k * 5 + i * 2) * 0.25;
      mote.scale.setScalar(Math.max(0.001, size));
    });
  });

  return (
    <group position={[STATUE.x, 0, STATUE.z]}>
      <mesh geometry={stone} castShadow receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.92} />
      </mesh>
      {/* one material for all that glows; each piece shows and hides by its scale or how much of it is drawn */}
      <group position={[MIRROR_AT.x, MIRROR_STONE.top + 0.012, MIRROR_AT.z]}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          {/* the ring starts at the back of the stone (towards the statue) and runs round */}
          <mesh ref={rim} visible={false} material={glow} rotation={[0, 0, Math.PI / 2]}>
            <ringGeometry args={[RIM.inner, RIM.outer, RIM.segments, 1]} />
          </mesh>
          <mesh ref={fill} visible={false} material={glow} position={[0, 0, -0.004]}>
            <circleGeometry args={[RIM.inner, 28]} />
          </mesh>
          {/* a unit ring, scaled out from the stone when the statue wakes (lying just over the grass's roots) */}
          <mesh ref={ring} visible={false} material={glow} position={[0, 0, -MIRROR_STONE.top + 0.05]}>
            <ringGeometry args={[0.96, 1, 56, 1]} />
          </mesh>
        </group>
        <mesh ref={wall} visible={false} geometry={veil} material={veilLight} />
        <instancedMesh ref={sparks} args={[sparkShape, glow, SPARKS]} visible={false} frustumCulled={false} />
      </group>
      <mesh ref={lit} visible={false} geometry={marks.geometry} material={glow} />
      <group ref={woken} visible={false} position={[0, PLINTH.top, 0]} scale={FIGURE_SCALE}>
        <group ref={eyes}>
          {EYES.map(([x, y, z], i) => (
            <mesh key={i} material={glow} position={[x, y, z]} scale={0.001}>
              <sphereGeometry args={[0.13, 10, 8]} />
            </mesh>
          ))}
        </group>
        <mesh geometry={strings} material={glow} />
      </group>
      <group ref={motes}>
        {Array.from({ length: Z_COUNT }, (_, i) => (
          <mesh key={i} material={glow} geometry={zShape} />
        ))}
      </group>
      <ClearingAir />
    </group>
  );
}

/** The air of the clearing: light slanting in through the trees, a leaf or two coming down, and fireflies once it's dark */
function ClearingAir() {
  const beamShape = useBuilt(beamGeometry);
  const beamLight = useBuilt(() => additive("#ffffff"));
  const leafShape = useBuilt(() => leafGeometry(0.15, 0.085));
  const dot = useBuilt(dotTexture);
  const flies = useBuilt(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FIREFLIES * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(FIREFLIES * 3), 3));
    // they wander: never cull them by where they started
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 2, 0), 14);
    return g;
  });
  const beam = useRef<THREE.Mesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const swarm = useRef<THREE.Points>(null);
  const state = useRef({ night: 0, checked: -1, dummy: new THREE.Object3D(), color: new THREE.Color() });

  useLayoutEffect(() => {
    const m = leaves.current;
    if (!m) return;
    const color = new THREE.Color();
    for (let i = 0; i < DRIFTING_LEAVES; i++) m.setColorAt(i, color.set(LEAF_COLORS[i % LEAF_COLORS.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    const st = state.current;
    // the sky changes slowly: ask it a few times a second
    if (now - st.checked > 0.25) {
      st.checked = now;
      st.night = skyAt(Date.now()).night;
    }
    const { night, dummy, color } = st;

    // sunlight by day, faint against the bright grass; a moonbeam at night, when it is most of the light there is
    if (beam.current) {
      const material = beam.current.material as THREE.MeshBasicMaterial;
      material.color.copy(SUNBEAM).lerp(MOONBEAM, night);
      material.opacity = THREE.MathUtils.lerp(0.07, 0.3, night) * (0.85 + Math.sin(now * 0.5) * 0.15);
    }

    // a leaf lets go now and then, and rocks its way down
    const m = leaves.current;
    if (m) {
      for (let i = 0; i < DRIFTING_LEAVES; i++) {
        const k = (now * (0.06 + hash(i, 111) * 0.04) + hash(i, 112)) % 1;
        const a = hash(i, 113) * Math.PI * 2;
        const r = 2.5 + hash(i, 114) * 5;
        dummy.position.set(Math.sin(a) * r + Math.sin(k * 21 + i) * 0.7, 7.5 * (1 - k) ** 1.15, Math.cos(a) * r + Math.cos(k * 17 + i) * 0.5);
        dummy.rotation.set(Math.sin(k * 30 + i) * 0.9, k * 14 + i, Math.cos(k * 26 + i) * 0.7);
        // it grows out of nothing up in the leaves, and is gone as it lands
        dummy.scale.setScalar(Math.max(0.001, Math.min(1, k * 12, (1 - k) * 30)));
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }

    // fireflies: each wanders its own slow loop and blinks in its own time
    const f = swarm.current;
    if (f) {
      f.visible = night > 0.08;
      if (f.visible) {
        const position = f.geometry.attributes.position;
        const tint = f.geometry.attributes.color;
        for (let i = 0; i < FIREFLIES; i++) {
          const a = hash(i, 121) * Math.PI * 2 + now * (hash(i, 122) - 0.5) * 0.12;
          const r = 1.8 + hash(i, 123) * 6.2 + Math.sin(now * 0.3 + i) * 0.5;
          position.setXYZ(i, Math.sin(a) * r, 0.5 + hash(i, 124) * 2.6 + Math.sin(now * 0.7 + i * 1.3) * 0.35, Math.cos(a) * r);
          const blink = Math.max(0, Math.sin(now * (0.9 + hash(i, 125) * 0.8) + i * 2.1)) ** 2;
          color.copy(FIREFLY).multiplyScalar(blink * night);
          tint.setXYZ(i, color.r, color.g, color.b);
        }
        position.needsUpdate = true;
        tint.needsUpdate = true;
      }
    }
  });

  return (
    <>
      {RICH ? <mesh ref={beam} geometry={beamShape} material={beamLight} /> : null}
      {DRIFTING_LEAVES > 0 ? (
        <instancedMesh ref={leaves} args={[leafShape, undefined, DRIFTING_LEAVES]} frustumCulled={false}>
          <meshLambertMaterial side={THREE.DoubleSide} />
        </instancedMesh>
      ) : null}
      <points ref={swarm} geometry={flies} visible={false}>
        <pointsMaterial
          map={dot}
          size={0.6}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </>
  );
}
