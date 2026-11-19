"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { woodland } from "../../model/nature";
import { ISLAND_BOUNDS, PATHS, STREAM, TOWER, hash } from "../../model/island";
import { SAND, roundedRect } from "./shared";
import { Water } from "./water";

/** The painted ground: grass with lighter and darker patches, shade under the woods, dirt paths and the plaza. */
const GROUND = { x0: -ISLAND_BOUNDS.x - 4, x1: ISLAND_BOUNDS.x + 4, z0: ISLAND_BOUNDS.zMin - 4, z1: ISLAND_BOUNDS.zMax + 4 };
const PX_PER_UNIT = 10;

function paintGround() {
  const width = (GROUND.x1 - GROUND.x0) * PX_PER_UNIT;
  const height = (GROUND.z1 - GROUND.z0) * PX_PER_UNIT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const px = (x: number) => (x - GROUND.x0) * PX_PER_UNIT;
  const pz = (z: number) => (z - GROUND.z0) * PX_PER_UNIT;

  ctx.fillStyle = "#c3d9a0";
  ctx.fillRect(0, 0, width, height);
  // soft patches of lighter and darker grass
  const patches = ["#b4ce8e", "#cfe2b0", "#a9c784", "#d6e6b8", "#bcd696"];
  for (let i = 0; i < 1400; i++) {
    const x = GROUND.x0 + hash(i, 81) * (GROUND.x1 - GROUND.x0);
    const z = GROUND.z0 + hash(i, 82) * (GROUND.z1 - GROUND.z0);
    const r = (1 + hash(i, 83) * 6) * PX_PER_UNIT;
    const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r);
    const colour = patches[i % patches.length];
    g.addColorStop(0, colour);
    g.addColorStop(1, `${colour}00`);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = g;
    ctx.fillRect(px(x) - r, pz(z) - r, r * 2, r * 2);
  }
  // deeper green in the woods
  for (let z = GROUND.z0; z < GROUND.z1; z += 2) {
    for (let x = GROUND.x0; x < GROUND.x1; x += 2) {
      const wood = woodland(x, z);
      if (wood < 0.45) continue;
      ctx.globalAlpha = (wood - 0.45) * 0.55;
      ctx.fillStyle = "#7f9f5f";
      ctx.fillRect(px(x), pz(z), 2 * PX_PER_UNIT, 2 * PX_PER_UNIT);
    }
  }
  ctx.globalAlpha = 1;
  // the beach blends in at the edge
  ctx.strokeStyle = "#e8dcbc";
  ctx.lineWidth = 3 * PX_PER_UNIT;
  ctx.filter = `blur(${2 * PX_PER_UNIT}px)`;
  ctx.strokeRect(0, 0, width, height);
  ctx.filter = "none";

  const softRect = (x0: number, x1: number, z0: number, z1: number, colour: string, radius: number, blur: number) => {
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(px(x0), pz(z0), (x1 - x0) * PX_PER_UNIT, (z1 - z0) * PX_PER_UNIT, radius * PX_PER_UNIT);
    ctx.fill();
    ctx.restore();
  };
  // dirt paths with a worn, soft edge, then gravel specks
  for (const path of PATHS) {
    softRect(path.x - path.w / 2 - 0.4, path.x + path.w / 2 + 0.4, path.z - path.d / 2 - 0.4, path.z + path.d / 2 + 0.4, "#c9b48a", 1.4, 8);
    softRect(path.x - path.w / 2, path.x + path.w / 2, path.z - path.d / 2, path.z + path.d / 2, "#dccaa0", 1.2, 3);
  }
  // the drum valley's trodden ground and the tower court
  ctx.save();
  ctx.filter = `blur(${3 * PX_PER_UNIT}px)`;
  ctx.fillStyle = "#d9c79e";
  ctx.beginPath();
  ctx.ellipse(px(72), pz(0), 17 * PX_PER_UNIT, 15 * PX_PER_UNIT, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d8cfbd";
  ctx.beginPath();
  ctx.arc(px(TOWER.x), pz(TOWER.z), 9 * PX_PER_UNIT, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the keyboard plaza: pale stone with a border
  softRect(-35, 35, -9.5, 15.5, "#d9cfbd", 6.5, 4);
  softRect(-34, 34, -9, 15, "#f3eee4", 6, 1);
  for (let i = 0; i < 9000; i++) {
    const x = GROUND.x0 + hash(i, 91) * (GROUND.x1 - GROUND.x0);
    const z = GROUND.z0 + hash(i, 92) * (GROUND.z1 - GROUND.z0);
    if (!PATHS.some((p) => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2)) continue;
    ctx.fillStyle = hash(i, 93) > 0.5 ? "#bba57c" : "#ece0c4";
    ctx.fillRect(px(x), pz(z), 3, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // the shape's UVs are world x / −z: map the whole canvas over the island once
  texture.repeat.set(1 / (GROUND.x1 - GROUND.x0), 1 / (GROUND.z1 - GROUND.z0));
  texture.offset.set(-GROUND.x0 / (GROUND.x1 - GROUND.x0), GROUND.z1 / (GROUND.z1 - GROUND.z0));
  return texture;
}

/** Shore parameters for the water shaders (stable objects: they key the materials) */
const SEA_SHORE: [number, number, number, number] = [ISLAND_BOUNDS.x + 9, ISLAND_BOUNDS.zMin - 9, ISLAND_BOUNDS.zMax + 9, 22];
const STREAM_SHORE: [number, number, number, number] = [STREAM.x, STREAM.width / 2, 0, 0];

export function Ground() {
  const assets = useMemo(() => {
    const { x, zMin, zMax } = ISLAND_BOUNDS;
    return {
      beach: roundedRect(-x - 9, x + 9, zMin - 9, zMax + 9, 22),
      grass: roundedRect(GROUND.x0, GROUND.x1, GROUND.z0, GROUND.z1, 18),
      sea: new THREE.PlaneGeometry(700, 600, 175, 150).rotateX(-Math.PI / 2),
      stream: new THREE.PlaneGeometry(STREAM.width, STREAM.zMax - STREAM.zMin + 10, 4, 60).rotateX(-Math.PI / 2),
      painted: paintGround(),
    };
  }, []);
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets]);

  return (
    <group>
      <Water kind="sea" geometry={assets.sea} shore={SEA_SHORE} position={[0, -0.3, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} geometry={assets.beach} receiveShadow>
        <meshStandardMaterial color={SAND} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} geometry={assets.grass} receiveShadow>
        <meshStandardMaterial map={assets.painted} roughness={1} />
      </mesh>
      {/* the stream, banks to the sea */}
      <Water kind="stream" geometry={assets.stream} shore={STREAM_SHORE} position={[STREAM.x, 0.02, (STREAM.zMin + STREAM.zMax) / 2]} />
    </group>
  );
}
