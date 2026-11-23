"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BUSHES, ROCKS, TREES, woodland } from "../../engine/nature";
import { ISLAND_BOUNDS, PATHS, STREAM, TOWER, hash } from "../../engine/island";
import { SAND, roundedRect } from "./shared";
import { Water } from "./water";

/** The painted ground: grass with lighter and darker patches, shade under the woods, dirt paths and the plaza. */
const GROUND = { x0: -ISLAND_BOUNDS.x - 4, x1: ISLAND_BOUNDS.x + 4, z0: ISLAND_BOUNDS.zMin - 4, z1: ISLAND_BOUNDS.zMax + 4 };
const PX_PER_UNIT = 10;
const GRASS_RADIUS = 18;

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
  // deeper green in the woods (blurred, so the woods' edge is a soft gradient rather than 2-unit steps)
  ctx.save();
  ctx.filter = `blur(${1.5 * PX_PER_UNIT}px)`;
  for (let z = GROUND.z0; z < GROUND.z1; z += 2) {
    for (let x = GROUND.x0; x < GROUND.x1; x += 2) {
      const wood = woodland(x, z);
      if (wood < 0.45) continue;
      ctx.globalAlpha = (wood - 0.45) * 0.55;
      ctx.fillStyle = "#7f9f5f";
      ctx.fillRect(px(x), pz(z), 2 * PX_PER_UNIT, 2 * PX_PER_UNIT);
    }
  }
  ctx.restore();
  // fine flecks of lighter and darker blades, so the grass reads as grass up close
  const FLECKS = ["#a4c07e", "#d3e4b4", "#9dbb78", "#c9dda6"];
  for (let i = 0; i < 16000; i++) {
    const x = hash(i, 84) * width;
    const z = hash(i, 85) * height;
    ctx.globalAlpha = 0.35 + hash(i, 86) * 0.35;
    ctx.fillStyle = FLECKS[i % FLECKS.length];
    ctx.fillRect(x, z, 2, 2 + Math.floor(hash(i, 87) * 3));
  }
  ctx.globalAlpha = 1;
  // soft shade under trees, bushes and rocks, so they sit on the ground even beyond the shadow map's reach
  const pool = (x: number, z: number, r: number, alpha: number) => {
    const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r * PX_PER_UNIT);
    g.addColorStop(0, `rgba(58, 84, 40, ${alpha})`);
    g.addColorStop(0.55, `rgba(58, 84, 40, ${alpha * 0.45})`);
    g.addColorStop(1, "rgba(58, 84, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(px(x) - r * PX_PER_UNIT, pz(z) - r * PX_PER_UNIT, r * 2 * PX_PER_UNIT, r * 2 * PX_PER_UNIT);
  };
  TREES.forEach((t) => pool(t.x, t.z, (t.kind === "oak" ? 2.4 : 2) * t.scale, 0.3));
  BUSHES.forEach((b) => pool(b.x, b.z, 1.3 * b.scale, 0.26));
  ROCKS.forEach((r) => pool(r.x, r.z, 1.2 * r.scale, 0.22));
  // the grass thins to sand along the (rounded) edge, in a few soft steps so there's no seam
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, GRASS_RADIUS * PX_PER_UNIT);
  ctx.clip();
  const SHORE_STEPS = [
    { w: 7, alpha: 0.18, colour: "#d9dcaa" },
    { w: 4.5, alpha: 0.4, colour: "#e2dbb2" },
    { w: 2.4, alpha: 0.75, colour: "#eadfbf" },
    { w: 1, alpha: 1, colour: SAND },
  ];
  SHORE_STEPS.forEach(({ w, alpha, colour }) => {
    ctx.filter = `blur(${w * 0.45 * PX_PER_UNIT}px)`;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = w * 2 * PX_PER_UNIT;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, GRASS_RADIUS * PX_PER_UNIT);
    ctx.stroke();
  });
  ctx.restore();

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
  // the keyboard plaza: a worn border, then pale paving slabs in a running bond
  softRect(-35, 35, -9.5, 15.5, "#cfc3ad", 6.5, 4);
  softRect(-34, 34, -9, 15, "#e8e0d2", 6, 1);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px(-33.2), pz(-8.2), 66.4 * PX_PER_UNIT, 22.4 * PX_PER_UNIT, 5.4 * PX_PER_UNIT);
  ctx.clip();
  const SLAB = 2;
  for (let row = 0, z = -8.2; z < 14.2; row++, z += SLAB) {
    for (let x = -33.2 - (row % 2) * (SLAB / 2); x < 33.2; x += SLAB) {
      const tone = 236 + Math.floor(hash(row * 131 + Math.round(x * 7), 61) * 14);
      ctx.fillStyle = `rgb(${tone + 6}, ${tone + 1}, ${tone - 9})`;
      ctx.fillRect(px(x) + 1, pz(z) + 1, SLAB * PX_PER_UNIT - 2, SLAB * PX_PER_UNIT - 2);
    }
  }
  // an inlaid stave across the open front of the plaza, with a few notes resting on it
  const STAVE = { x0: -22, x1: 22, z: 10.2, gap: 0.45 };
  ctx.strokeStyle = "#c4b597";
  ctx.lineWidth = 0.12 * PX_PER_UNIT;
  for (let line = 0; line < 5; line++) {
    ctx.beginPath();
    ctx.moveTo(px(STAVE.x0), pz(STAVE.z + line * STAVE.gap));
    ctx.lineTo(px(STAVE.x1), pz(STAVE.z + line * STAVE.gap));
    ctx.stroke();
  }
  ctx.fillStyle = "#b9a888";
  [[-14, 3], [-10, 2], [-6, 4], [-2, 1], [3, 3], [7, 2], [11, 0], [15, 2]].forEach(([x, step]) => {
    ctx.beginPath();
    ctx.ellipse(px(x), pz(STAVE.z + (4 - step) * STAVE.gap), 0.32 * PX_PER_UNIT, 0.22 * PX_PER_UNIT, -0.35, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
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

/**
 * The beach: dry, pale sand up by the grass, darker wet sand along the
 * waterline, and a faint grain — all from world position, no texture.
 */
function beachMaterial() {
  const material = new THREE.MeshStandardMaterial({ color: SAND, roughness: 1 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBeach = { value: new THREE.Vector4(...SEA_SHORE) };
    shader.vertexShader = `varying vec2 vBeach;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vBeach = (modelMatrix * vec4(transformed, 1.0)).xz;`,
    );
    shader.fragmentShader = `uniform vec4 uBeach;\nvarying vec2 vBeach;\n${shader.fragmentShader}`.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      {
        vec2 centre = vec2(0.0, (uBeach.y + uBeach.z) * 0.5);
        vec2 q = abs(vBeach - centre) - vec2(uBeach.x, (uBeach.z - uBeach.y) * 0.5) + uBeach.w;
        float inland = -(length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uBeach.w);
        vec2 g = floor(vBeach * 7.0);
        float grain = fract(sin(dot(g, vec2(127.1, 311.7))) * 43758.5453);
        // the wet line wanders a little along the shore
        float reach = 1.6 + 0.6 * sin(vBeach.x * 0.21 + vBeach.y * 0.17) + 0.4 * sin(vBeach.x * 0.53 - vBeach.y * 0.37);
        float wet = smoothstep(reach, 0.2, inland);
        diffuseColor.rgb *= mix(1.0, 0.78, wet) * (0.97 + grain * 0.05);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.74, 0.60), wet * 0.25);
      }`,
    );
  };
  material.customProgramCacheKey = () => "island-beach";
  return material;
}

export function Ground() {
  const assets = useMemo(() => {
    const { x, zMin, zMax } = ISLAND_BOUNDS;
    return {
      beach: roundedRect(-x - 9, x + 9, zMin - 9, zMax + 9, 22),
      grass: roundedRect(GROUND.x0, GROUND.x1, GROUND.z0, GROUND.z1, GRASS_RADIUS),
      sea: new THREE.PlaneGeometry(700, 600, 175, 150).rotateX(-Math.PI / 2),
      stream: new THREE.PlaneGeometry(STREAM.width, STREAM.zMax - STREAM.zMin + 10, 4, 60).rotateX(-Math.PI / 2),
      painted: paintGround(),
      sand: beachMaterial(),
    };
  }, []);
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets]);

  return (
    <group>
      <Water kind="sea" geometry={assets.sea} shore={SEA_SHORE} position={[0, -0.3, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} geometry={assets.beach} material={assets.sand} receiveShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} geometry={assets.grass} receiveShadow>
        <meshStandardMaterial map={assets.painted} roughness={1} />
      </mesh>
      {/* the stream, banks to the sea */}
      <Water kind="stream" geometry={assets.stream} shore={STREAM_SHORE} position={[STREAM.x, 0.02, (STREAM.zMin + STREAM.zMax) / 2]} />
    </group>
  );
}
