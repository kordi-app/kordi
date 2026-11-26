"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Accessory } from "@/entities/character/three";
import {
  ABYSS_FLOOR,
  ALTAR,
  CAVE_CELL,
  CAVE_COLS,
  CAVE_FEATURES,
  CAVE_ROWS,
  DAIS_STEPS,
  DAIS_TOP,
  FLOOR_CELLS,
  ILLUSORY_REVEAL,
  ILLUSORY_WALL,
  NECKLACE_SPOT,
  STAR_RESTS,
  WALL_FACES,
  WALL_TOP,
  caveCell,
  caveRuntime,
  cellX,
  cellZ,
} from "../engine/cave";
import { CLIFF } from "../engine/island";
import { REGIONS } from "../engine/regions";
import type { RemotePlayer } from "../net/protocol";
import { mergeParts, paint, useBuilt } from "./island/shared";
import { quality } from "./quality";

/**
 * The cave of sleeping stars (engine/cave.ts): rock, a chasm, two star rests and
 * the altar. Everything here is drawn dark; what you see is what light reaches
 * it — the faint glow round Kordi, and the cosmic crown's starlight (yours, and
 * anyone else's in here wearing one). Stars sleep in the walls: they wake as a
 * crown passes and stay softly lit behind it, so the way you came glows.
 *
 * All the stone that never moves — flagstones, the heaped rock of the walls,
 * pillars, the bridge, the dais — is merged into three meshes (one per stretch
 * of the cave, so what is out of sight is culled) sharing one material; its
 * variety is in the shapes and in vertex colours. Everything that glows
 * softly — halos round woken stars, the star rests' pools of light, the haze
 * far down in the abyss — is one instanced mesh of soft sprites.
 */

const STONE = "#24202c";
const STONE_DEEP = "#15121b";
const STONE_WORN = "#3a3446";
const DAIS = "#2f2a38";
const DAIS_EDGE = "#40394f";
const CARVED = "#0e0c13";
const INLAY = "#5d5378";
/** now and then the rock runs to slate blue, or to violet */
const SEAMS = ["#1c2636", "#33254a"];
const CRYSTAL = "#4a3a78";
const CRYSTAL_TIP = "#8f7fd0";
const STAR_ASLEEP = new THREE.Color("#2a2340");
const STAR_AWAKE = [new THREE.Color("#d9ccff"), new THREE.Color("#ffe3a3"), new THREE.Color("#a8e6ff")];
const CROWN_LIGHT = "#e4dcff";
const REST_AWAKE = new THREE.Color("#ffd27a");
const REST_ASLEEP = new THREE.Color("#4a3f66");
const ALTAR_GOLD = new THREE.Color("#ffd27a");
/** the abyss, shallow to deep: violet haze over a blue glow from further down than you can see */
const HAZE = [new THREE.Color("#4a3a9a"), new THREE.Color("#3a3fa8"), new THREE.Color("#2f55b0")];

/** A wall star wakes within this distance of a crown, and keeps this much glow once woken */
const WAKE_REACH = 8.5;
const WAKE_KEEP = 0.32;
/** Other people's crowns light the cave too: this many of the nearest */
const REMOTE_CROWN_LIGHTS = 3;
/** The crown's light on the way ahead: this far in front of Kordi, this high, this bright and far-reaching at full light */
const CROWN_AHEAD = { reach: 3.2, height: 2.6, intensity: 30, distance: 12 };

const RICH = quality.tier !== "minimal";
const byTier = (high: number, low: number, minimal: number) => (quality.tier === "high" ? high : quality.tier === "low" ? low : minimal);

const hash = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export interface CaveSceneProps {
  player: THREE.Vector3;
  /** 0 (dark) … 1 (the crown's full light), eased by the world each frame */
  light: RefObject<number>;
  /** the necklace is already yours: the altar stands empty */
  owned: boolean;
  remotes: RefObject<Map<string, RemotePlayer>>;
}

export function CaveScene({ player, light, owned, remotes }: CaveSceneProps) {
  /** one soft round dot for every glow in the cave */
  const dot = useBuilt(dotTexture);
  return (
    <>
      <CaveRock />
      <Abyss light={light} dot={dot} />
      <Starlight player={player} light={light} owned={owned} remotes={remotes} dot={dot} />
      <StarRests />
      <Altar light={light} owned={owned} />
      <Dust player={player} light={light} />
      <CrownLights player={player} light={light} remotes={remotes} />
    </>
  );
}

function dotTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

// --- rock --------------------------------------------------------------------

/** A cell next to the abyss: its stone drops all the way down */
const besideAbyss = (r: number, c: number) =>
  [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ].some(([rr, cc]) => caveCell(rr, cc) === " ");

const rowOf = (z: number) => Math.round((z - cellZ(0)) / CAVE_CELL);
const colOf = (x: number) => Math.round(x / CAVE_CELL + (CAVE_COLS - 1) / 2);
const NEIGHBOURS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;
/** Somewhere to stand: neither rock nor the abyss */
const isFloor = (r: number, c: number) => caveCell(r, c) !== "#" && caveCell(r, c) !== " ";

/** The rows the abyss runs through, and the x it spans */
const ABYSS_ROWS = [...Array(CAVE_ROWS).keys()].filter((r) => [...Array(CAVE_COLS).keys()].some((c) => caveCell(r, c) === " "));
const ABYSS = {
  z0: cellZ(ABYSS_ROWS[0]) - CAVE_CELL / 2,
  z1: cellZ(ABYSS_ROWS[ABYSS_ROWS.length - 1]) + CAVE_CELL / 2,
  width: CAVE_COLS * CAVE_CELL,
};
const onBridge = (r: number) => r >= ABYSS_ROWS[0] && r <= ABYSS_ROWS[ABYSS_ROWS.length - 1];

/** The joint between flagstones, and how thick the bridge's deck is */
const JOINT = 0.05;
const DECK = 0.5;

const tone = new THREE.Color();
const tint = new THREE.Color();

/** A stone's own shade: somewhere between the cave's two greys, now and then from a seam of another colour */
function shade(seed: number, worn = 0) {
  tone.set(STONE).lerp(tint.set(STONE_DEEP), hash(seed, 1) * 0.65);
  if (hash(seed, 2) > 0.86) tone.lerp(tint.set(SEAMS[seed % SEAMS.length]), 0.35);
  return tone.lerp(tint.set(STONE_WORN), worn).clone();
}

/**
 * A lump of rock: a simple solid with every corner knocked out of true, darker
 * at its foot and paler where light from above would reach, with faint bands
 * across it like strata.
 */
function boulder(
  seed: number,
  kind: "rock" | "stone",
  size: [x: number, y: number, z: number],
  at: [x: number, y: number, z: number],
  base: THREE.Color,
  { rough = 0.2, lit = [0, 4] as [from: number, to: number] } = {},
) {
  const g = kind === "rock" ? new THREE.DodecahedronGeometry(1, 0) : new THREE.OctahedronGeometry(1, 0);
  const position = g.attributes.position;
  for (let v = 0; v < position.count; v++) {
    const x = position.getX(v);
    const y = position.getY(v);
    const z = position.getZ(v);
    // the same corner belongs to several faces: move them together, or the rock splits open
    const corner = Math.round(x * 50) * 7 + Math.round(y * 50) * 131 + Math.round(z * 50) * 1013 + seed * 17;
    const push = 1 + (hash(corner, 3) - 0.5) * 2 * rough;
    position.setXYZ(v, x * push, y * push, z * push);
  }
  g.scale(...size)
    .rotateX((hash(seed, 4) - 0.5) * 0.7)
    .rotateZ((hash(seed, 5) - 0.5) * 0.7)
    .rotateY(hash(seed, 6) * Math.PI)
    .translate(...at);
  const colors = new Float32Array(position.count * 3);
  for (let v = 0; v < position.count; v++) {
    const y = position.getY(v);
    const height = THREE.MathUtils.smoothstep(y, lit[0], lit[1]);
    tone.copy(base).multiplyScalar((0.7 + height * 0.55) * (1 + Math.sin(y * 2.7 + seed) * 0.08));
    tone.toArray(colors, v * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** A flat carving lying on a floor (made facing +z, about the origin) */
const laid = (g: THREE.BufferGeometry, x: number, y: number, z: number, turn = 0) => g.rotateX(-Math.PI / 2).rotateY(turn).translate(x, y, z);

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

/** A turned shape (radius, height pairs) */
const lathe = (points: number[][], segments: number) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/** Colours a part by height: `low` at y0 running to `high` at y1 */
function graded(g: THREE.BufferGeometry, low: THREE.ColorRepresentation, high: THREE.ColorRepresentation, y0: number, y1: number) {
  const position = g.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let v = 0; v < position.count; v++) {
    tone.set(low).lerp(tint.set(high), THREE.MathUtils.clamp((position.getY(v) - y0) / (y1 - y0), 0, 1)).toArray(colors, v * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

type Put = (z: number, ...parts: THREE.BufferGeometry[]) => void;

/** The floor: every cell one or two worn flagstones; over the abyss, a deck on piers with what is left of its kerb */
function layFloor(put: Put) {
  FLOOR_CELLS.forEach((cell, i) => {
    const r = rowOf(cell.z);
    const c = colOf(cell.x);
    const deep = besideAbyss(r, c);
    const bridge = deep && onBridge(r);
    // down the middle the stone is paler: polished by whoever came this way before
    const worn = Math.abs(cell.x) < CAVE_CELL * 1.2 ? 0.16 : 0;
    const thickness = bridge ? DECK : deep ? 2.4 : 0.6 + cell.top;
    const cut = hash(i, 61);
    // one flag, two side by side, or two end to end
    const flags =
      cut < 0.4
        ? [[0, 0, 1, 1]]
        : cut < 0.7
          ? [
              [-0.25, 0, 0.5, 1],
              [0.25, 0, 0.5, 1],
            ]
          : [
              [0, -0.25, 1, 0.5],
              [0, 0.25, 1, 0.5],
            ];
    flags.forEach(([ox, oz, w, d], k) => {
      // a flag may have settled a hair (never where a mound's steps are counted in heights)
      const sunk = cell.top > 0 ? 0 : hash(i * 3 + k, 62) * 0.02;
      put(
        cell.z,
        paint(
          new THREE.BoxGeometry(w * CAVE_CELL - JOINT, thickness, d * CAVE_CELL - JOINT).translate(
            cell.x + ox * CAVE_CELL,
            cell.top - sunk - thickness / 2,
            cell.z + oz * CAVE_CELL,
          ),
          shade(i * 3 + k, worn),
        ),
      );
    });
    const underDais = Math.abs(cell.x - ALTAR.x) <= DAIS_STEPS[0].half && Math.abs(cell.z - ALTAR.z) <= DAIS_STEPS[0].half;
    if (cell.top === 0 && !underDais && RICH) {
      // here and there a flag has cracked across
      if (hash(i, 63) < 0.16) {
        let x = cell.x + (hash(i, 64) - 0.5) * 0.8;
        let z = cell.z - 0.7;
        for (let s = 0; s < 3; s++) {
          const turn = (hash(i * 5 + s, 65) - 0.5) * 1.4;
          const length = 0.4 + hash(i * 5 + s, 66) * 0.2;
          put(cell.z, paint(laid(new THREE.PlaneGeometry(0.035, length), x + (Math.sin(turn) * length) / 2, 0.004, z + (Math.cos(turn) * length) / 2, turn), CARVED));
          x += Math.sin(turn) * length;
          z += Math.cos(turn) * length;
        }
      }
      // and along the worn way, every few paces, a small star is let into the stone
      else if (cell.x === 0 && r % 3 === 0 && !STAR_RESTS.some((rest) => rest.z === cell.z)) {
        put(cell.z, paint(laid(starShape(4, 0.3, 0.1), cell.x, 0.006, cell.z, Math.PI / 4), INLAY));
      }
    }
    if (!bridge) {
      // the lip of the cliff: a low kerb where the floor ends over the drop
      if (deep) layKerb(put, cell, r, c, i);
      return;
    }
    // under the deck: a corbel, and a pier going down into the dark
    put(cell.z, paint(new THREE.BoxGeometry(1.72, 0.34, 1.72).translate(cell.x, -DECK - 0.17, cell.z), shade(i + 400)));
    put(cell.z, paint(new THREE.BoxGeometry(1.4, 0.3, 1.4).translate(cell.x, -DECK - 0.49, cell.z), shade(i + 500)));
    put(cell.z, graded(new THREE.CylinderGeometry(0.6, 0.95, 11, 6, 1, true).rotateY(hash(i, 67)).translate(cell.x, -DECK - 0.64 - 5.5, cell.z), CARVED, STONE, -8, -1));
    layKerb(put, cell, r, c, i);
  });
}

/** Along each edge of a cell that looks over the abyss: kerb stones, some long gone — or, where the bridge broke, its jagged end */
function layKerb(put: Put, cell: { x: number; z: number }, r: number, c: number, seed: number) {
  NEIGHBOURS.forEach(([dr, dc], side) => {
    if (caveCell(r + dr, c + dc) !== " ") return;
    // the broken span: open water of nothing on both sides, and the bridge going on beyond it
    const broken = isFloor(r + dr * 2, c + dc * 2) && caveCell(r + dr + dc, c + dc + dr) === " " && caveCell(r + dr - dc, c + dc - dr) === " ";
    const edge = CAVE_CELL / 2;
    if (broken) {
      for (let k = 0; k < 4; k++) {
        const along = (k - 1.5) * 0.48 + (hash(seed * 7 + k, 68) - 0.5) * 0.2;
        const out = edge + 0.1 + hash(seed * 7 + k, 69) * 0.3;
        put(
          cell.z,
          boulder(seed * 11 + k, "stone", [0.3, 0.2 + hash(seed + k, 70) * 0.12, 0.36], [cell.x + dc * out + dr * along, -0.28 - hash(seed + k, 71) * 0.2, cell.z + dr * out + dc * along], shade(seed + k), {
            lit: [-1, 0.5],
          }),
        );
      }
      return;
    }
    for (let k = 0; k < 3; k++) {
      if (hash(seed * 13 + side * 3 + k, 72) < 0.22) continue;
      const along = (k - 1) * 0.66;
      const tall = 0.1 + hash(seed * 13 + side * 3 + k, 73) * 0.06;
      const stone = new THREE.BoxGeometry(dc !== 0 ? 0.2 : 0.6, tall, dc !== 0 ? 0.6 : 0.2).translate(
        cell.x + dc * (edge - 0.12) + dr * along,
        tall / 2,
        cell.z + dr * (edge - 0.12) + dc * along,
      );
      put(cell.z, paint(stone, shade(seed + side + k, 0.35)));
    }
  });
}

/** Rough boulders heaped along every rock cell that faces the cave; beside the abyss they go down into it */
function heapWalls(put: Put) {
  WALL_FACES.forEach((cell, i) => {
    const deep = besideAbyss(cell.r, cell.c);
    // rock between the camera (to the south) and the cave stays low, so it never hides Kordi:
    // the cave's south walls, and the thin wall the chasm is entered through, which stands
    // between the camera and Kordi once you're out over the abyss
    const cameraSide =
      (caveCell(cell.r - 1, cell.c) !== "#" && caveCell(cell.r + 1, cell.c) === "#") || caveCell(cell.r - 1, cell.c) === " ";
    for (let k = 0; k < 2; k++) {
      const tall = cameraSide ? 0.12 + hash(i, k + 3) * 0.1 : 0.45 + hash(i, k + 3) * 0.35;
      const sy = (WALL_TOP * tall) / 2 + (deep ? 3 : 0);
      put(
        cell.z,
        boulder(
          i * 2 + k,
          "rock",
          [1.05 + hash(i, k + 11) * 0.5, sy, 1.05 + hash(i, k + 13) * 0.5],
          [cell.x + (hash(i, k) - 0.5) * 1.1, deep ? sy * 0.2 - 3 : sy * 0.55, cell.z + (hash(i, k + 7) - 0.5) * 1.1],
          shade(i * 2 + k + 900),
        ),
      );
    }
    if (!RICH) return;
    NEIGHBOURS.forEach(([dr, dc], side) => {
      if (!isFloor(cell.r + dr, cell.c + dc)) return;
      const seed = i * 4 + side;
      const along = (hash(seed, 81) - 0.5) * 1.5;
      const out = CAVE_CELL / 2 + 0.05 + hash(seed, 82) * 0.3;
      const x = cell.x + dc * out + dr * along;
      const z = cell.z + dr * out + dc * along;
      // scree fallen at the wall's foot
      if (hash(seed, 83) < 0.6) {
        const size = 0.14 + hash(seed, 84) * 0.16;
        put(cell.z, boulder(seed + 2000, "stone", [size * 1.3, size, size * 1.1], [x, size * 0.45, z], shade(seed + 2000), { rough: 0.3, lit: [0, 1] }));
      }
      // and in a few places crystal has grown out of the rock: dull as slate until starlight finds it
      else if (hash(seed, 83) > 0.86 && !cameraSide) {
        const spikes = 3 + (seed % 3);
        for (let s = 0; s < spikes; s++) {
          const tall = 0.35 + hash(seed * 5 + s, 85) * 0.55;
          const spike = new THREE.CylinderGeometry(0.02, 0.07 + tall * 0.08, tall, 5)
            .translate(0, tall / 2, 0)
            .rotateZ((hash(seed * 5 + s, 86) - 0.5) * 1.1)
            .rotateX((hash(seed * 5 + s, 87) - 0.5) * 1.1)
            .translate(x - dc * 0.2 + (hash(seed * 5 + s, 88) - 0.5) * 0.3, 0, z - dr * 0.2 + (hash(seed * 5 + s, 89) - 0.5) * 0.3);
          put(cell.z, graded(spike, CRYSTAL, CRYSTAL_TIP, 0, 0.9));
        }
      }
    });
  });
}

/** Out in the abyss, away from the bridge: spires standing up out of the dark, their tops far below you */
function raiseSpires(put: Put) {
  for (const r of ABYSS_ROWS) {
    for (let c = 0; c < CAVE_COLS; c++) {
      if (caveCell(r, c) !== " " || NEIGHBOURS.some(([dr, dc]) => isFloor(r + dr, c + dc))) continue;
      const seed = r * 31 + c;
      if (hash(seed, 91) > 0.34) continue;
      const top = -2.2 - hash(seed, 92) * 5;
      const tall = 9;
      const spire = new THREE.CylinderGeometry(0.12, 0.8 + hash(seed, 93) * 0.5, tall, 6, 3).rotateY(hash(seed, 94) * 3);
      const position = spire.attributes.position;
      for (let v = 0; v < position.count; v++) {
        const corner = Math.round(position.getX(v) * 30) * 7 + Math.round(position.getY(v) * 30) * 131 + Math.round(position.getZ(v) * 30) * 1013 + seed;
        position.setX(v, position.getX(v) + (hash(corner, 95) - 0.5) * 0.3);
        position.setZ(v, position.getZ(v) + (hash(corner, 96) - 0.5) * 0.3);
      }
      put(cellZ(r), graded(spire.translate(cellX(c) + (hash(seed, 97) - 0.5), top - tall / 2, cellZ(r) + (hash(seed, 98) - 0.5)), CARVED, STONE_WORN, top - 5, top));
    }
  }
}

/** A fallen column: the stump you can hop onto on its base, its top broken off at a slant, and the rest of it toppled beside */
function brokenPillar(x: number, z: number, seed: number) {
  const parts: THREE.BufferGeometry[] = [
    // a square base, a round moulding, the fluted drum (twelve flat sides read as flutes)
    paint(new THREE.BoxGeometry(1.5, 0.14, 1.5).translate(0, 0.07, 0), DAIS),
    paint(new THREE.CylinderGeometry(0.72, 0.76, 0.1, 12).translate(0, 0.19, 0), DAIS_EDGE),
    graded(new THREE.CylinderGeometry(0.62, 0.68, 0.76, 12).translate(0, 0.62, 0), STONE, DAIS_EDGE, 0.2, 1),
    // where it broke: a jagged ridge left standing on one side
    paint(new THREE.ConeGeometry(0.42, 0.26, 5).rotateZ(0.2).rotateX(0.3).translate(0.16, 1.04, 0.05), DAIS),
    paint(new THREE.ConeGeometry(0.2, 0.2, 4).translate(-0.3, 1.04, -0.2), DAIS),
    // the rest of it lies beside: two drums, the further one still wearing its capital
    graded(new THREE.CylinderGeometry(0.3, 0.32, 1.2, 10).rotateZ(Math.PI / 2).rotateY(0.6).translate(1.1, 0.3, 0.5), STONE_DEEP, STONE_WORN, 0, 0.6),
    paint(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 10).rotateZ(Math.PI / 2).rotateY(0.6).translate(1.1 + Math.cos(0.6) * 0.3, 0.3, 0.5 - Math.sin(0.6) * 0.3), STONE),
    paint(new THREE.BoxGeometry(0.16, 0.74, 0.74).rotateY(0.6).translate(1.1 + Math.cos(0.6) * 0.68, 0.37, 0.5 - Math.sin(0.6) * 0.68), DAIS),
    boulder(seed + 3000, "stone", [0.2, 0.14, 0.24], [-0.95, 0.07, 0.75], shade(seed + 3000), { lit: [0, 0.6] }),
    boulder(seed + 3001, "stone", [0.13, 0.1, 0.12], [0.55, 0.05, 1.15], shade(seed + 3001), { lit: [0, 0.6] }),
  ];
  const tilt = (hash(seed, 2) - 0.5) * 0.2;
  return parts.map((g) => g.rotateY(hash(seed, 1) * Math.PI).rotateX(tilt).translate(x, 0, z));
}

/** Dripstone: tier on tier, each a little narrower, wet-pale towards its tip, a smaller one beside it */
function stalagmite(x: number, z: number, seed: number) {
  const tiers: [radius: number, tall: number, from: number][] = [
    [0.62, 0.9, 0],
    [0.46, 1.5, 0.3],
    [0.3, 1.5, 1.1],
  ];
  const parts = tiers.map(([radius, tall, from], k) => {
    const cone = new THREE.ConeGeometry(radius, tall, 7).rotateY(hash(seed, 10 + k) * 3);
    return graded(cone.translate((hash(seed, 20 + k) - 0.5) * 0.08, from + tall / 2, (hash(seed, 30 + k) - 0.5) * 0.08), STONE_DEEP, STONE_WORN, 0, 2.8);
  });
  parts.push(graded(new THREE.ConeGeometry(0.25, 1.1, 6).translate(0.38, 0.55, 0.2), STONE_DEEP, STONE_WORN, 0, 2.2));
  parts.push(graded(new THREE.ConeGeometry(0.16, 0.6, 5).translate(-0.3, 0.3, 0.32), STONE_DEEP, STONE_WORN, 0, 2.2));
  return parts.map((g) => g.rotateY(hash(seed, 3) * Math.PI).translate(x, 0, z));
}

/** The star cut into the dais's top round the pedestal, and the ring that holds it (made flat, facing +z) */
function daisStar() {
  const top = DAIS_STEPS[DAIS_STEPS.length - 1].half;
  return [new THREE.RingGeometry(top * 0.8, top * 0.86, 40), new THREE.RingGeometry(ALTAR.pedestal + 0.12, ALTAR.pedestal + 0.18, 24), starRing(8, top * 0.76, top * 0.5, ALTAR.pedestal + 0.18)];
}

/** A star's points only: the star with its middle cut out to a circle */
function starRing(points: number, outer: number, inner: number, hole: number) {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const half = Math.PI / points;
    const shape = new THREE.Shape();
    shape.moveTo(Math.sin(a) * outer, Math.cos(a) * outer);
    shape.lineTo(Math.sin(a + half) * inner, Math.cos(a + half) * inner);
    shape.lineTo(Math.sin(a) * hole, Math.cos(a) * hole);
    shape.lineTo(Math.sin(a - half) * inner, Math.cos(a - half) * inner);
    shape.closePath();
    parts.push(new THREE.ShapeGeometry(shape));
  }
  return mergeParts(parts);
}

/** The five-pointed star cut into a star rest's stone (made flat, facing +z) */
const restStar = () => starShape(5, 0.5, 0.2);

/** The altar's dais and pedestal, carved: nosed treads, a frieze of lozenges and stars along each riser, a star round the pedestal */
function carveAltar(put: Put) {
  const at = (g: THREE.BufferGeometry) => g.translate(ALTAR.x, 0, ALTAR.z);
  let below = 0;
  DAIS_STEPS.forEach((step, s) => {
    const rise = step.top - below;
    put(ALTAR.z, at(paint(new THREE.BoxGeometry(step.half * 2, rise, step.half * 2).translate(0, below + rise / 2, 0), DAIS)));
    // the tread's nosing: a paler lip, worn by feet
    put(ALTAR.z, at(paint(new THREE.BoxGeometry(step.half * 2 + 0.05, 0.05, step.half * 2 + 0.05).translate(0, step.top - 0.025, 0), DAIS_EDGE)));
    // the frieze, on the three risers that can be seen from the way in
    const mid = below + (rise - 0.05) / 2;
    for (const turn of [0, Math.PI / 2, -Math.PI / 2]) {
      const count = Math.round((step.half * 2) / 0.5);
      for (let k = 0; k < count; k++) {
        const x = (k - (count - 1) / 2) * 0.5;
        const star = (k + s) % 4 === 0;
        const mark = star ? starShape(4, 0.1, 0.035) : new THREE.PlaneGeometry(0.1, 0.1).rotateZ(Math.PI / 4);
        put(ALTAR.z, at(paint(mark.translate(x, mid, step.half + 0.004).rotateY(turn), star ? INLAY : CARVED)));
      }
    }
    below = step.top;
  });
  // let into the top: a ring, and an eight-pointed star round the pedestal's foot (it lights in the crown's starlight)
  for (const mark of daisStar()) put(ALTAR.z, at(paint(laid(mark, 0, DAIS_TOP + 0.004, 0), INLAY)));
  // the pedestal: a moulded foot, a fluted shaft, a collar, and the shallow bowl the necklace floats over
  const p = ALTAR.pedestal;
  const h = ALTAR.pedestalTop - DAIS_TOP;
  const profile = [
    [p * 1.25, 0],
    [p * 1.25, 0.08],
    [p * 1.05, 0.12],
    [p, 0.2],
    [p * 0.78, 0.26],
    [p * 0.72, h - 0.3],
    [p * 0.92, h - 0.24],
    [p * 0.92, h - 0.18],
    [p * 0.8, h - 0.12],
    [p * 1.12, h - 0.02],
    [p * 1.12, h + 0.06],
    [p * 0.95, h + 0.1],
    [p * 0.7, h + 0.04],
    [0, h + 0.02],
  ];
  put(ALTAR.z, at(graded(lathe(profile, 10).translate(0, DAIS_TOP, 0), DAIS, DAIS_EDGE, DAIS_TOP, ALTAR.pedestalTop)));
}

/** A star rest's ring of old stone: two worn courses, a star cut in the top, small stones set round it */
function carveRest(put: Put, rest: { x: number; z: number }, seed: number) {
  const at = (g: THREE.BufferGeometry) => g.translate(rest.x, 0, rest.z);
  put(rest.z, at(paint(new THREE.CylinderGeometry(0.86, 0.94, 0.08, 14).translate(0, 0.04, 0), DAIS)));
  put(rest.z, at(paint(new THREE.CylinderGeometry(0.7, 0.76, 0.1, 14).translate(0, 0.12, 0), DAIS_EDGE)));
  put(rest.z, at(paint(laid(restStar(), 0, 0.174, 0), CARVED)));
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + Math.PI / 5;
    put(rest.z, boulder(seed * 9 + k, "stone", [0.13, 0.11, 0.13], [rest.x + Math.sin(a) * 1.16, 0.06, rest.z + Math.cos(a) * 1.16], shade(seed + k, 0.4), { lit: [0, 0.4] }));
  }
}

/** The cave falls into three stretches (the altar's hall, the abyss, the hall of pillars): what you aren't in is mostly out of sight */
const STRETCH_ENDS = [ABYSS.z0, ABYSS.z1];

function caveRock() {
  const stretches: THREE.BufferGeometry[][] = [[], [], []];
  const put: Put = (z, ...parts) => stretches[z < STRETCH_ENDS[0] ? 0 : z < STRETCH_ENDS[1] ? 1 : 2].push(...parts);
  layFloor(put);
  heapWalls(put);
  if (RICH) raiseSpires(put);
  CAVE_FEATURES.forEach((f, i) => put(f.z, ...(f.kind === "pillar" ? brokenPillar(f.x, f.z, i) : stalagmite(f.x, f.z, i))));
  carveAltar(put);
  STAR_RESTS.forEach((rest, i) => carveRest(put, rest, i));
  const geometries = stretches.map((parts) => {
    // nothing here is textured, and the solids come with different texture coordinates (or none)
    for (const part of parts) part.deleteAttribute("uv");
    return mergeParts(parts);
  });
  return { geometries, dispose: () => geometries.forEach((g) => g.dispose()) };
}

function CaveRock() {
  const rock = useBuilt(caveRock);
  const material = useBuilt(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.94 }));
  return (
    <>
      {rock.geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} castShadow receiveShadow />
      ))}
    </>
  );
}

// --- the abyss ----------------------------------------------------------------

const ABYSS_STARS = byTier(90, 50, 20);

/**
 * Far below the bridge. The drop reads as deep because there are things at
 * several depths in it: spires of rock (part of the cave's stone), haze in
 * layers (soft sprites, drawn with the starlight), and at the very bottom
 * more sleeping stars than there are in the walls: faint even in the dark
 * (they are the one thing here that needs no light of yours), bright under
 * the crown.
 */
function Abyss({ light, dot }: Pick<CaveSceneProps, "light"> & { dot: THREE.Texture }) {
  const points = useRef<THREE.Points>(null);
  const stars = useBuilt(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(ABYSS_STARS * 3);
    const colors = new Float32Array(ABYSS_STARS * 3);
    for (let i = 0; i < ABYSS_STARS; i++) {
      positions[i * 3] = (hash(i, 41) - 0.5) * (ABYSS.width - 10);
      positions[i * 3 + 1] = ABYSS_FLOOR + 1 + hash(i, 42) ** 2 * 7;
      positions[i * 3 + 2] = THREE.MathUtils.lerp(ABYSS.z0 + 0.5, ABYSS.z1 - 0.5, hash(i, 43));
      tone.copy(STAR_AWAKE[i % STAR_AWAKE.length]).multiplyScalar(0.35 + hash(i, 44) * 0.65).toArray(colors, i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  });
  useFrame(({ clock }) => {
    const p = points.current;
    if (!p) return;
    const level = light.current ?? 0;
    (p.material as THREE.PointsMaterial).opacity = (0.22 + 0.78 * level) * (0.85 + Math.sin(clock.getElapsedTime() * 0.9) * 0.15);
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, ABYSS_FLOOR + 0.5, (ABYSS.z0 + ABYSS.z1) / 2]}>
        <planeGeometry args={[ABYSS.width, ABYSS.z1 - ABYSS.z0]} />
        <meshBasicMaterial color="#120a26" />
      </mesh>
      <points ref={points} geometry={stars}>
        <pointsMaterial map={dot} size={0.3} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </points>
    </>
  );
}

// --- the sleeping stars ---------------------------------------------------------

/** Small crystals set in the rock where it faces open cave, at different heights */
const WALL_STARS = (() => {
  const stars: { x: number; y: number; z: number; tint: number; size: number }[] = [];
  WALL_FACES.forEach((cell, i) => {
    const open = NEIGHBOURS.filter(([dr, dc]) => caveCell(cell.r + dr, cell.c + dc) === ".");
    open.forEach(([dr, dc], k) => {
      if (hash(i, k + 21) < 0.2) return; // not every stretch of rock has one
      const along = (hash(i, k + 23) - 0.5) * 1.4;
      stars.push({
        x: cell.x + dc * 0.95 + (dr !== 0 ? along : 0),
        y: 0.6 + hash(i, k + 25) * 2.4,
        z: cell.z + dr * 0.95 + (dc !== 0 ? along : 0),
        tint: Math.floor(hash(i, k + 27) * STAR_AWAKE.length),
        size: 0.11 + hash(i, k + 29) * 0.1,
      });
    });
  });
  return stars;
})();

/** Where a crown is shining this frame (mine and others'), and how brightly */
interface Shine {
  x: number;
  y: number;
  z: number;
  level: number;
}

/** Remote players wearing the cosmic crown, nearest first (the cave lights for them too) */
function crownedRemotes(remotes: Map<string, RemotePlayer>, player: THREE.Vector3, out: Shine[]) {
  out.length = 0;
  for (const p of remotes.values()) {
    if (p.look?.hat !== "star-crown") continue;
    out.push({ x: p.x, y: p.y ?? 0, z: p.z, level: 1 });
  }
  out.sort((a, b) => Math.hypot(a.x - player.x, a.z - player.z) - Math.hypot(b.x - player.x, b.z - player.z));
  if (out.length > REMOTE_CROWN_LIGHTS) out.length = REMOTE_CROWN_LIGHTS;
  return out;
}

/** A woken wall star wears a halo (not on the lowest tier: there the stars alone must do) */
const STAR_HALOS = RICH ? WALL_STARS.length : 0;
/**
 * After the stars' halos, the cave's other soft lights, as sprites in the same
 * mesh: over each star rest a halo and a pool on the floor, a pool on the
 * altar's dais, and the abyss's layers of haze.
 */
const GLOW = {
  rests: STAR_HALOS,
  altar: STAR_HALOS + STAR_RESTS.length * 2,
  haze: STAR_HALOS + STAR_RESTS.length * 2 + 1,
  count: STAR_HALOS + STAR_RESTS.length * 2 + 1 + HAZE.length,
};
/** How far below the bridge each layer of haze hangs */
const HAZE_DEPTH = [-3.5, -7.5, -12];
/** Upright sprites lean back to face the cave's camera, which looks down from the south */
const FACE_CAMERA = -Math.atan2(REGIONS.cave.camera[1], REGIONS.cave.camera[2]);

function Starlight({ player, light, owned, remotes, dot }: CaveSceneProps & { dot: THREE.Texture }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const glows = useRef<THREE.InstancedMesh>(null);
  /** how awake each star is, 0–1 (eases up fast near a crown, settles back to WAKE_KEEP once woken) */
  const wake = useMemo(() => new Float32Array(WALL_STARS.length), []);
  const scratch = useMemo(() => ({ color: new THREE.Color(), shines: [] as Shine[] }), []);
  useLayoutEffect(() => {
    const m = mesh.current;
    const g = glows.current;
    if (!m || !g) return;
    const dummy = new THREE.Object3D();
    WALL_STARS.forEach((star, i) => {
      dummy.position.set(star.x, star.y, star.z);
      dummy.rotation.set(hash(i, 1) * 3, hash(i, 2) * 3, 0);
      // shards, not beads: each a little longer one way
      dummy.scale.set(star.size * 0.8, star.size * (1.2 + hash(i, 3) * 0.7), star.size * 0.8);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, STAR_ASLEEP);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    wake.fill(0);

    const black = new THREE.Color(0, 0, 0);
    const place = (i: number, x: number, y: number, z: number, tilt: number, sx: number, sy = sx) => {
      dummy.position.set(x, y, z);
      dummy.rotation.set(tilt, 0, 0);
      dummy.scale.set(sx, sy, 1);
      dummy.updateMatrix();
      g.setMatrixAt(i, dummy.matrix);
      g.setColorAt(i, black);
    };
    for (let i = 0; i < STAR_HALOS; i++) {
      const star = WALL_STARS[i];
      // a little towards the camera, so the halo isn't cut by the rock the star sits in
      place(i, star.x, star.y + 0.1, star.z + 0.25, FACE_CAMERA, star.size * 9);
    }
    STAR_RESTS.forEach((rest, i) => {
      place(GLOW.rests + i * 2, rest.x, 1.15, rest.z + 0.1, FACE_CAMERA, 3);
      place(GLOW.rests + i * 2 + 1, rest.x, 0.2, rest.z, -Math.PI / 2, 6.5);
    });
    place(GLOW.altar, ALTAR.x, DAIS_TOP + 0.03, ALTAR.z, -Math.PI / 2, 6);
    HAZE.forEach((_, i) => place(GLOW.haze + i, 0, HAZE_DEPTH[i], (ABYSS.z0 + ABYSS.z1) / 2, -Math.PI / 2, ABYSS.width * (0.8 + i * 0.25), (ABYSS.z1 - ABYSS.z0) * (1.1 + i * 0.3)));
    g.instanceMatrix.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
  }, [wake]);
  useFrame(({ clock }, rawDelta) => {
    const m = mesh.current;
    const g = glows.current;
    if (!m || !g) return;
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    const shines = crownedRemotes(remotes.current, player, scratch.shines);
    const mine = light.current ?? 0;
    if (mine > 0.01) shines.push({ x: player.x, y: player.y, z: player.z, level: mine });
    WALL_STARS.forEach((star, i) => {
      let near = 0;
      for (const s of shines) {
        const d = Math.hypot(star.x - s.x, star.y - (s.y + 1.4), star.z - s.z);
        near = Math.max(near, s.level * THREE.MathUtils.smoothstep(WAKE_REACH - d, 0, WAKE_REACH - 2));
      }
      const woken = wake[i] >= WAKE_KEEP ? WAKE_KEEP : 0;
      const target = Math.max(near, woken);
      // wake quickly, fall asleep slowly
      wake[i] += (target - wake[i]) * (1 - Math.exp(-dt * (target > wake[i] ? 6 : 0.8)));
      const twinkle = 0.85 + 0.15 * Math.sin(t * 2.3 + i * 1.7);
      scratch.color.copy(STAR_ASLEEP).lerp(STAR_AWAKE[star.tint], Math.min(1, wake[i] * twinkle));
      m.setColorAt(i, scratch.color);
      // its halo: nothing while it sleeps (the sprites add their colour to what's behind them)
      if (i < STAR_HALOS) g.setColorAt(i, scratch.color.copy(STAR_AWAKE[star.tint]).multiplyScalar(wake[i] * twinkle * 0.5));
    });
    STAR_RESTS.forEach((_, i) => {
      const awake = caveRuntime.rests[i];
      const breath = 1 + Math.sin(t * 2.2 + i) * 0.12;
      g.setColorAt(GLOW.rests + i * 2, scratch.color.copy(awake ? REST_AWAKE : REST_ASLEEP).multiplyScalar(awake ? 0.6 * breath : 0.3));
      g.setColorAt(GLOW.rests + i * 2 + 1, scratch.color.copy(awake ? REST_AWAKE : REST_ASLEEP).multiplyScalar(awake ? 0.3 * breath : 0.08));
    });
    // the necklace's own glow on the dais, while it is there to be taken
    const showing = !owned && !caveRuntime.taken && mine > 0.25;
    g.setColorAt(GLOW.altar, scratch.color.copy(ALTAR_GOLD).multiplyScalar(mine * (showing ? 0.32 + Math.sin(t * 1.3) * 0.05 : 0.06)));
    HAZE.forEach((tintOf, i) => {
      g.setColorAt(GLOW.haze + i, scratch.color.copy(tintOf).multiplyScalar((0.03 + 0.11 * mine) * (1 + i * 0.35) * (1 + Math.sin(t * 0.4 + i * 2) * 0.15)));
    });
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (g.instanceColor) g.instanceColor.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={mesh} args={[undefined, undefined, WALL_STARS.length]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glows} args={[undefined, undefined, GLOW.count]} frustumCulled={false} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={dot} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

/** The star that sleeps over a rest: long points up and down, short ones round its waist */
function restStarGeometry() {
  return mergeParts([new THREE.OctahedronGeometry(1, 0).scale(0.55, 1.5, 0.55), new THREE.OctahedronGeometry(1, 0).scale(1.05, 0.38, 1.05).rotateY(Math.PI / 4)]);
}

/** Star rests: a ring of old stone with a star asleep over it; touched, it burns gold and lights the way back */
function StarRests() {
  const stars = useRef<(THREE.Mesh | null)[]>([]);
  const marks = useRef<(THREE.Mesh | null)[]>([]);
  const beams = useRef<(THREE.Mesh | null)[]>([]);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  /** how far each rest's beam has risen, 0–1 */
  const risen = useRef(STAR_RESTS.map(() => 0));
  const starShapeOf = useBuilt(restStarGeometry);
  const mark = useBuilt(() => laid(restStar(), 0, 0.18, 0));
  const beam = useBuilt(() => {
    // a slender column of light, bright at the foot and gone by the top (colour is brightness)
    const g = new THREE.CylinderGeometry(0.16, 0.5, 1, 14, 1, true).translate(0, 0.5, 0);
    const shade = new Float32Array(g.attributes.position.count * 3);
    for (let v = 0; v < g.attributes.position.count; v++) shade.fill(g.attributes.position.getY(v) < 0.5 ? 1 : 0, v * 3, v * 3 + 3);
    g.setAttribute("color", new THREE.BufferAttribute(shade, 3));
    return g;
  });
  const beamLight = useBuilt(
    () =>
      new THREE.MeshBasicMaterial({
        color: REST_AWAKE,
        vertexColors: true,
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
  );
  useFrame(({ clock }, rawDelta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(rawDelta, 0.05);
    STAR_RESTS.forEach((_, i) => {
      const awake = caveRuntime.rests[i];
      const star = stars.current[i];
      if (star) {
        star.rotation.y = t * (awake ? 1.2 : 0.3);
        star.position.y = 1.1 + Math.sin(t * 1.5 + i) * 0.08;
        const material = star.material as THREE.MeshBasicMaterial;
        material.color.copy(awake ? REST_AWAKE : REST_ASLEEP);
        star.scale.setScalar(awake ? 0.24 + Math.sin(t * 3) * 0.02 : 0.16);
      }
      // the star cut in the stone under it takes the same light
      const cut = marks.current[i];
      if (cut) {
        cut.visible = awake;
        (cut.material as THREE.MeshBasicMaterial).color.copy(REST_AWAKE).multiplyScalar(0.75 + Math.sin(t * 2.2 + i) * 0.12);
      }
      // and, woken, it sends a column of light up into the dark (it rises over a moment; a visit starts with it down)
      risen.current[i] = awake ? Math.min(1, risen.current[i] + dt * 1.4) : 0;
      const column = beams.current[i];
      if (column) {
        column.visible = risen.current[i] > 0;
        column.scale.y = 0.01 + 3.4 * (1 - (1 - risen.current[i]) ** 3);
      }
      const lamp = lights.current[i];
      if (lamp) lamp.intensity = awake ? 7 + Math.sin(t * 2.2 + i) * 0.8 : 0.6;
    });
  });
  return (
    <>
      {STAR_RESTS.map((rest, i) => (
        <group key={i} position={[rest.x, 0, rest.z]}>
          <mesh
            geometry={starShapeOf}
            ref={(el) => {
              stars.current[i] = el;
            }}
          >
            <meshBasicMaterial toneMapped={false} />
          </mesh>
          <mesh
            geometry={mark}
            visible={false}
            ref={(el) => {
              marks.current[i] = el;
            }}
          >
            <meshBasicMaterial toneMapped={false} />
          </mesh>
          <mesh
            geometry={beam}
            material={beamLight}
            visible={false}
            position={[0, 0.2, 0]}
            ref={(el) => {
              beams.current[i] = el;
            }}
          />
          <pointLight
            ref={(el) => {
              lights.current[i] = el;
            }}
            position={[0, 1.3, 0]}
            color="#ffcf7a"
            distance={7}
            decay={1.6}
          />
        </group>
      ))}
    </>
  );
}

// --- the altar ---------------------------------------------------------------

const lightMaterial = (color: string) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

/** What moves and glows at the altar (its stone is part of the cave's rock): the light from above, the star in the dais, the necklace */
function Altar({ light, owned }: Pick<CaveSceneProps, "light" | "owned">) {
  const necklace = useRef<THREE.Group>(null);
  const shaft = useRef<THREE.Mesh>(null);
  const star = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.PointLight>(null);
  const shaftMaterial = useBuilt(() => lightMaterial("#ffe2a0"));
  const starMaterial = useBuilt(() => lightMaterial("#ffd27a"));
  const starShapeOf = useBuilt(() => mergeParts(daisStar().map((g) => laid(g, 0, DAIS_TOP + 0.008, 0))));
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const level = light.current ?? 0;
    // the necklace is there only in starlight, and only until someone takes it
    const showing = !owned && !caveRuntime.taken && level > 0.25;
    if (necklace.current) {
      necklace.current.visible = showing;
      necklace.current.rotation.y = t * 0.6;
      necklace.current.position.y = NECKLACE_SPOT.y + Math.sin(t * 1.3) * 0.08;
    }
    if (shaft.current) {
      shaft.current.rotation.y = t * 0.05;
      (shaft.current.material as THREE.MeshBasicMaterial).opacity = (showing ? 0.07 : 0.015) * level;
    }
    // the star cut into the dais drinks the crown's light; brightest while the necklace waits over it
    if (star.current) (star.current.material as THREE.MeshBasicMaterial).opacity = level * (showing ? 0.55 + Math.sin(t * 1.3) * 0.12 : 0.16);
    if (glow.current) glow.current.intensity = showing ? 5 * level : 0.8 * level;
  });
  return (
    <group position={[ALTAR.x, 0, ALTAR.z]}>
      {/* light falling on the altar from somewhere far above */}
      <mesh ref={shaft} position={[0, ALTAR.pedestalTop + 6, 0]} material={shaftMaterial}>
        <cylinderGeometry args={[0.55, 1.3, 12, 18, 1, true]} />
      </mesh>
      <mesh ref={star} geometry={starShapeOf} material={starMaterial} />
      <pointLight ref={glow} position={[0, NECKLACE_SPOT.y + 0.4, 0]} color="#ffd27a" distance={9} decay={1.5} />
      <group ref={necklace} position={[0, NECKLACE_SPOT.y, 0]}>
        {/* the necklace as it hangs on Kordi, lifted off its shoulders */}
        <group scale={1.6} position={[0, -0.64 * 1.6, 0]}>
          <Accessory accessory="gold-necklace" />
        </group>
      </group>
    </group>
  );
}

// --- air and light --------------------------------------------------------------

const DUST_COUNT = 140;
/** round Kordi, mostly ahead of it: a mote right in front of the camera would be a big square */
const DUST_BOX = { x: 16, y: 5, z: 14, zAhead: 10 };

/** Motes drifting down through whatever light there is */
function Dust({ player, light }: Pick<CaveSceneProps, "player" | "light">) {
  const points = useRef<THREE.Points>(null);
  const geometry = useBuilt(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3] = (hash(i, 1) - 0.5) * DUST_BOX.x;
      positions[i * 3 + 1] = hash(i, 2) * DUST_BOX.y;
      positions[i * 3 + 2] = DUST_BOX.zAhead * -1 + hash(i, 3) * DUST_BOX.z;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  });
  const material = useBuilt(
    () =>
      new THREE.PointsMaterial({
        color: "#e8e0ff",
        size: 0.07,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
  );
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const p = points.current;
    if (!p) return;
    // the box of motes travels with you; each wraps round inside it
    p.position.set(player.x, 0, player.z);
    const attribute = p.geometry.attributes.position;
    const positions = attribute.array as Float32Array;
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3 + 1] -= dt * (0.12 + hash(i, 4) * 0.15);
      if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] += DUST_BOX.y;
    }
    attribute.needsUpdate = true;
    (p.material as THREE.PointsMaterial).opacity = 0.12 + 0.5 * (light.current ?? 0);
  });
  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/**
 * The light you see by: a faint glow round Kordi always (enough to see your
 * feet), the crown's starlight when you wear it, and the crowns of others nearby.
 */
function CrownLights({ player, light, remotes }: Pick<CaveSceneProps, "player" | "light" | "remotes">) {
  const mine = useRef<THREE.PointLight>(null);
  const ahead = useRef<THREE.PointLight>(null);
  const others = useRef<(THREE.PointLight | null)[]>([]);
  const shines = useMemo<Shine[]>(() => [], []);
  useFrame(({ clock }) => {
    const level = light.current ?? 0;
    const flicker = 1 + Math.sin(clock.getElapsedTime() * 2.7) * 0.04;
    if (mine.current) {
      // a little in front (toward the camera), so it lights Kordi's face, not just the crown
      mine.current.position.set(player.x, player.y + 2.2, player.z + 1.8);
      mine.current.intensity = (2.2 + 34 * level) * flicker;
      mine.current.distance = 4 + 13 * level;
    }
    if (ahead.current) {
      // the crown also throws its light on the way ahead: the cave runs away from the camera
      // (−z), and with only the light at Kordi's face the next flagstone (or the gap before it)
      // was as dark as the abyss. Always on (at nothing without the crown): a light switched
      // on or off changes the light count, and every material in the cave would recompile
      ahead.current.position.set(player.x, player.y + CROWN_AHEAD.height, player.z - CROWN_AHEAD.reach);
      ahead.current.intensity = CROWN_AHEAD.intensity * level * flicker;
      // never 0: to three.js a distance of 0 means no limit at all
      ahead.current.distance = Math.max(1, CROWN_AHEAD.distance * level);
    }
    crownedRemotes(remotes.current, player, shines);
    others.current.forEach((lamp, i) => {
      if (!lamp) return;
      const s = shines[i];
      lamp.visible = s !== undefined;
      if (s) lamp.position.set(s.x, s.y + 2.4, s.z);
    });
  });
  return (
    <>
      <pointLight ref={mine} color={CROWN_LIGHT} decay={1.6} />
      <pointLight ref={ahead} color={CROWN_LIGHT} decay={1.6} intensity={0} />
      {[...Array(REMOTE_CROWN_LIGHTS).keys()].map((i) => (
        <pointLight
          key={i}
          ref={(el) => {
            others.current[i] = el;
          }}
          color={CROWN_LIGHT}
          intensity={26}
          distance={14}
          decay={1.6}
          visible={false}
        />
      ))}
    </>
  );
}

/**
 * The cave's air follows its light: in the dark the fog closes right in; in
 * the crown's starlight it draws back and the sky light comes up a little.
 */
export function lightCave(
  scene: THREE.Scene,
  hemi: THREE.HemisphereLight | null,
  theme: { fog: readonly [number, number]; ambient: number },
  level: number,
) {
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.near = theme.fog[0] + 6 * level;
    scene.fog.far = theme.fog[1] + 24 * level;
  }
  if (hemi) hemi.intensity = theme.ambient + 0.4 * level;
}

// --- the way in ----------------------------------------------------------------

const SHIMMER_COUNT = 36;

/**
 * The illusory wall, seen from the island: nothing at all — unless you wear the
 * cosmic crown and come close, when stars shimmer over that stretch of rock.
 */
export function IllusoryWall({ player, crowned }: { player: THREE.Vector3; crowned: boolean }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useBuilt(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(SHIMMER_COUNT * 3);
    for (let i = 0; i < SHIMMER_COUNT; i++) {
      positions[i * 3] = (hash(i, 31) - 0.5) * ILLUSORY_WALL.width;
      positions[i * 3 + 1] = 0.2 + hash(i, 32) * 3;
      positions[i * 3 + 2] = hash(i, 33) * 0.06;
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  });
  const material = useBuilt(
    () =>
      new THREE.PointsMaterial({
        color: "#d9ccff",
        size: 0.12,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
  );
  useFrame(({ clock }) => {
    const d = Math.hypot(player.x - ILLUSORY_WALL.x, player.z - ILLUSORY_WALL.z);
    const near = crowned ? THREE.MathUtils.smoothstep(ILLUSORY_REVEAL - d, 0, ILLUSORY_REVEAL - 2) : 0;
    const p = points.current;
    if (!p) return;
    (p.material as THREE.PointsMaterial).opacity = near * (0.55 + 0.35 * Math.sin(clock.getElapsedTime() * 2.1));
    p.visible = near > 0.01;
  });
  return (
    <points ref={points} geometry={geometry} material={material} position={[ILLUSORY_WALL.x, 0, CLIFF.front + 0.05]} visible={false} />
  );
}
