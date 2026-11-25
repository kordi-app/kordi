"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ISLAND_BOUNDS, STREAM, hash } from "../../engine/island";
import { TREES, woodland } from "../../engine/nature";
import { quality } from "../quality";
import { mergeParts, paint } from "./shared";

/**
 * Small things that finish the landscape's edges, none of them solid: stones
 * and reeds along the stream's banks (so the water doesn't end on a ruled
 * line), pebbles, shells and driftwood on the beach, rocks in the surf, and
 * mushrooms at the feet of the woodland trees.
 *
 * Everything is vertex-coloured and merged into a few meshes by longitude
 * (one material; the renderer culls the bands that are off screen).
 */

const BAND = 50;
/** The CPU renderer keeps every n-th piece */
const STRIDE = quality.tier === "minimal" ? 3 : 1;

const STONES = ["#a39d94", "#b3ada3", "#938c84", "#c2bbae", "#aaa69b"];
const PEBBLES = ["#cfc6b4", "#b9b1a2", "#dcd3bf", "#a8a297", "#e6dccb"];
const SHELLS = ["#ffe3e0", "#fff6ee", "#f7cfc9", "#f3e0c8"];
const REEDS = ["#7fa85a", "#8fb765", "#73994f"];
const CATTAIL = "#7a5a3c";
const DRIFTWOOD = "#b89b78";
const SEA_ROCKS = ["#8d8a86", "#9a9690", "#7f7c79"];
const CAPS = ["#e0604f", "#d9a066", "#e8785c"];
const STEM = "#f3ead8";

type Parts = { x: number; geometry: THREE.BufferGeometry }[];

/** Signed distance to a rounded rectangle centred on (0, cz): negative inside */
function roundBox(x: number, z: number, halfX: number, z0: number, z1: number, r: number) {
  const qx = Math.abs(x) - halfX + r;
  const qz = Math.abs(z - (z0 + z1) / 2) - (z1 - z0) / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
}
/** …to the beach's outer edge, where the sea begins (the same shape ground.tsx gives the water) */
const toSea = (x: number, z: number) => roundBox(x, z, ISLAND_BOUNDS.x + 9, ISLAND_BOUNDS.zMin - 9, ISLAND_BOUNDS.zMax + 9, 22);

/** A squat, tilted lump of rock resting at ground level `y` */
function stone(x: number, y: number, z: number, size: number, n: number, colours: string[]) {
  return paint(
    new THREE.DodecahedronGeometry(size, 0)
      .scale(1 + hash(n, 301) * 0.4, 0.5 + hash(n, 302) * 0.25, 0.85 + hash(n, 303) * 0.3)
      .rotateY(hash(n, 304) * 6.28)
      .translate(x, y + size * 0.12, z),
    colours[Math.floor(hash(n, 305) * colours.length)],
  );
}

function streamBanks(parts: Parts) {
  const half = STREAM.width / 2;
  let n = 0;
  for (const side of [-1, 1]) {
    // stones straddling the waterline, bigger ones now and then
    for (let z = STREAM.zMin + 2; z < STREAM.zMax - 2; z += 0.8 + hash(n, 311) * 1.5) {
      n++;
      if (Math.abs(z) < 2.8 || n % STRIDE !== 0) continue; // the bridge's footings stay clear
      const size = 0.16 + hash(n, 312) ** 2 * 0.36;
      const x = STREAM.x + side * (half + (hash(n, 313) - 0.4) * 0.5);
      parts.push({ x, geometry: stone(x, 0, z, size, n, STONES) });
    }
    // reeds standing in the shallows, a cattail or two among them
    for (let z = STREAM.zMin + 6; z < STREAM.zMax - 4; z += 4 + hash(n, 314) * 7) {
      n++;
      if (Math.abs(z) < 4.2 || n % STRIDE !== 0) continue;
      const cx = STREAM.x + side * (half - 0.35 - hash(n, 315) * 0.3);
      const blades = 5 + Math.floor(hash(n, 316) * 4);
      for (let b = 0; b < blades; b++) {
        const k = n * 16 + b;
        const tall = 0.7 + hash(k, 317) * 0.7;
        const x = cx + (hash(k, 318) - 0.5) * 0.5;
        const bz = z + (hash(k, 319) - 0.5) * 1.3;
        parts.push({
          x,
          geometry: paint(
            new THREE.ConeGeometry(0.04, tall, 4)
              .translate(0, tall / 2, 0)
              .rotateZ((hash(k, 320) - 0.5) * 0.35)
              .rotateX((hash(k, 321) - 0.5) * 0.35)
              .translate(x, 0, bz),
            REEDS[k % REEDS.length],
          ),
        });
        if (b < 2) {
          const stalk = tall + 0.25;
          parts.push({ x, geometry: paint(new THREE.CylinderGeometry(0.014, 0.018, stalk, 4).translate(x + 0.12, stalk / 2, bz + 0.1), REEDS[0]) });
          parts.push({ x, geometry: paint(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 6).translate(x + 0.12, stalk - 0.08, bz + 0.1), CATTAIL) });
        }
      }
    }
  }
}

/** A five-armed star lying flat */
function starfish(x: number, z: number, n: number) {
  const shape = new THREE.Shape();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const r = k % 2 === 0 ? 0.26 : 0.1;
    if (k === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  return paint(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).rotateY(hash(n, 331) * 6.28).translate(x, 0.02, z), "#f2946b");
}

function beach(parts: Parts) {
  const spanX = ISLAND_BOUNDS.x + 30;
  const z0 = ISLAND_BOUNDS.zMin - 30;
  const z1 = ISLAND_BOUNDS.zMax + 30;
  for (let n = 0; n < 12000; n += STRIDE) {
    const x = (hash(n, 341) * 2 - 1) * spanX;
    const z = z0 + hash(n, 342) * (z1 - z0);
    const sea = toSea(x, z);
    const pick = hash(n, 343);
    if (sea > -7.2 && sea < -0.6) {
      // on the sand: mostly pebbles, gathering toward the tideline; now and then a shell, a starfish, a log
      if (hash(n, 344) > 0.35 + (sea + 7.2) * 0.09) continue;
      if (pick < 0.74) parts.push({ x, geometry: stone(x, -0.02, z, 0.07 + hash(n, 345) ** 2 * 0.25, n, PEBBLES) });
      else if (pick < 0.93) {
        const shell = new THREE.SphereGeometry(0.1, 6, 4).scale(1.2, 0.45, 0.9).rotateY(hash(n, 346) * 6.28).translate(x, 0.01, z);
        parts.push({ x, geometry: paint(shell, SHELLS[n % SHELLS.length]) });
      } else if (pick < 0.97) parts.push({ x, geometry: starfish(x, z, n) });
      else {
        const log = new THREE.CylinderGeometry(0.1, 0.14, 1.4 + hash(n, 347) * 1.4, 6)
          .rotateZ(Math.PI / 2)
          .rotateY(hash(n, 348) * 6.28)
          .translate(x, 0.08, z);
        parts.push({ x, geometry: paint(log, DRIFTWOOD) });
      }
    } else if (sea > 1.2 && sea < 13 && pick < 0.022) {
      // rocks standing in the surf, a few in a huddle
      const size = 0.6 + hash(n, 349) * 1.3;
      parts.push({ x, geometry: stone(x, -0.45, z, size, n, SEA_ROCKS) });
      parts.push({ x, geometry: stone(x + size * 0.9, -0.5, z + size * 0.5, size * 0.5, n + 7, SEA_ROCKS) });
    }
  }
}

function mushrooms(parts: Parts) {
  TREES.forEach((tree, i) => {
    if (i % STRIDE !== 0 || woodland(tree.x, tree.z) < 0.5 || hash(i, 351) > 0.4) return;
    const count = 2 + Math.floor(hash(i, 352) * 3);
    const cap = CAPS[Math.floor(hash(i, 353) * CAPS.length)];
    for (let k = 0; k < count; k++) {
      const n = i * 8 + k;
      const angle = hash(n, 354) * Math.PI * 2;
      const out = (0.75 + hash(n, 355) * 0.5) * tree.scale;
      const x = tree.x + Math.cos(angle) * out;
      const z = tree.z + Math.sin(angle) * out;
      const s = 0.8 + hash(n, 356) * 0.9;
      parts.push({ x, geometry: paint(new THREE.CylinderGeometry(0.035 * s, 0.05 * s, 0.16 * s, 5).translate(x, 0.08 * s, z), STEM) });
      parts.push({
        x,
        geometry: paint(new THREE.SphereGeometry(0.13 * s, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1).translate(x, 0.14 * s, z), cap),
      });
    }
  });
}

function build() {
  const parts: Parts = [];
  streamBanks(parts);
  beach(parts);
  mushrooms(parts);
  const bands = new Map<number, THREE.BufferGeometry[]>();
  for (const part of parts) {
    const band = Math.floor(part.x / BAND);
    const list = bands.get(band);
    if (list) list.push(part.geometry);
    else bands.set(band, [part.geometry]);
  }
  return [...bands.values()].map((list) => {
    const merged = mergeParts(list);
    merged.computeBoundingSphere();
    return merged;
  });
}

export function IslandDressing() {
  const bands = useMemo(() => build(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }), []);
  useEffect(
    () => () => {
      bands.forEach((g) => g.dispose());
      material.dispose();
    },
    [bands, material],
  );
  return (
    <group>
      {bands.map((geometry, i) => (
        <mesh key={i} geometry={geometry} material={material} receiveShadow />
      ))}
    </group>
  );
}
