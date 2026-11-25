"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { BLOSSOMS, BUSHES, FLOWER_BEDS, ROCKS, TREES, bloom, woodland } from "../../engine/nature";
import { DRUMS, ISLAND_BOUNDS, LAMPS, PATHS, STREAM, TOWER, hash } from "../../engine/island";
import { WHITE_L, keySpan } from "../../engine/layout";
import { BRIDGE_RAIL_Z, SEA, STREAM_LEVEL } from "../../engine/water";
import { SAND, roundedRect } from "./shared";
import { Water } from "./water";

/**
 * The painted ground: grass that changes across the island (sunny and cool
 * stretches, lighter where flowers bloom, deeper under the woods), the
 * stream's earthy banks, flagstone paths, the tower's cobbled court, the
 * plaza with its kerb and flower beds. One texture, so all of it is free to draw.
 */
const GROUND = { x0: -ISLAND_BOUNDS.x - 4, x1: ISLAND_BOUNDS.x + 4, z0: ISLAND_BOUNDS.zMin - 4, z1: ISLAND_BOUNDS.zMax + 4 };
const PX_PER_UNIT = 10;
const GRASS_RADIUS = 18;
/**
 * The grass is painted well below the pale pastel it ends up: the island's
 * light is strong, and a lighter ground washes out to cream, leaving the
 * tufts standing on it like dark weeds instead of belonging to a lawn.
 */
const GRASS_BASE = "#a9cc7c";

function paintGround() {
  const width = (GROUND.x1 - GROUND.x0) * PX_PER_UNIT;
  const height = (GROUND.z1 - GROUND.z0) * PX_PER_UNIT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const U = PX_PER_UNIT;
  const px = (x: number) => (x - GROUND.x0) * U;
  const pz = (z: number) => (z - GROUND.z0) * U;
  const blob = (x: number, z: number, r: number, colour: string, alpha: number) => {
    const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r * U);
    g.addColorStop(0, colour);
    g.addColorStop(1, `${colour}00`);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(px(x) - r * U, pz(z) - r * U, r * 2 * U, r * 2 * U);
  };
  const anywhere = (i: number, salt: number) =>
    [GROUND.x0 + hash(i, salt) * (GROUND.x1 - GROUND.x0), GROUND.z0 + hash(i, salt + 1) * (GROUND.z1 - GROUND.z0)] as const;

  ctx.fillStyle = GRASS_BASE;
  ctx.fillRect(0, 0, width, height);
  // the lie of the land: broad sunnier and cooler stretches, so no two views share one green
  for (let i = 0; i < 70; i++) {
    const [x, z] = anywhere(i, 401);
    blob(x, z, 9 + hash(i, 403) * 15, i % 2 ? "#bfd97c" : "#8dc07e", 0.4);
  }
  // soft patches of lighter and darker grass
  const patches = ["#9bc26e", "#b9d78c", "#92bb66", "#c0db93", "#a4c977"];
  for (let i = 0; i < 1400; i++) {
    const [x, z] = anywhere(i, 81);
    blob(x, z, 1 + hash(i, 83) * 6, patches[i % patches.length], 0.55);
  }
  // lighter, yellower grass where the flowers bloom; deeper green in the woods
  // (blurred, so each edge is a soft gradient rather than 2-unit steps)
  ctx.save();
  ctx.filter = `blur(${1.5 * U}px)`;
  for (let z = GROUND.z0; z < GROUND.z1; z += 2) {
    for (let x = GROUND.x0; x < GROUND.x1; x += 2) {
      const meadow = bloom(x, z);
      if (meadow > 0.2) {
        ctx.globalAlpha = meadow * 0.6;
        ctx.fillStyle = "#cbe08c";
        ctx.fillRect(px(x), pz(z), 2 * U, 2 * U);
      }
      const wood = woodland(x, z);
      if (wood < 0.45) continue;
      ctx.globalAlpha = (wood - 0.45) * 0.55;
      ctx.fillStyle = "#6f9a52";
      ctx.fillRect(px(x), pz(z), 2 * U, 2 * U);
    }
  }
  ctx.restore();
  // fine flecks of lighter and darker blades, so the grass reads as grass up close
  const FLECKS = ["#8fb866", "#c3dc98", "#88b160", "#b5d388"];
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
    const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), r * U);
    g.addColorStop(0, `rgba(58, 84, 40, ${alpha})`);
    g.addColorStop(0.55, `rgba(58, 84, 40, ${alpha * 0.45})`);
    g.addColorStop(1, "rgba(58, 84, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(px(x) - r * U, pz(z) - r * U, r * 2 * U, r * 2 * U);
  };
  TREES.forEach((t) => pool(t.x, t.z, (t.kind === "oak" ? 2.4 : 2) * t.scale, 0.3));
  BUSHES.forEach((b) => pool(b.x, b.z, 1.3 * b.scale, 0.26));
  ROCKS.forEach((r) => pool(r.x, r.z, 1.2 * r.scale, 0.22));
  // fallen petals under the trees in blossom, thickest near the trunk
  BLOSSOMS.forEach((tree, i) => {
    for (let k = 0; k < 110; k++) {
      const n = i * 128 + k;
      const angle = hash(n, 411) * Math.PI * 2;
      const out = hash(n, 412) ** 0.8 * 3.6 * tree.scale;
      ctx.globalAlpha = 0.55 + hash(n, 413) * 0.4;
      ctx.fillStyle = n % 3 === 0 ? "#fff1f4" : "#fbc4d3";
      ctx.fillRect(px(tree.x + Math.cos(angle) * out), pz(tree.z + Math.sin(angle) * out), 2 + (n % 2), 2);
    }
  });
  ctx.globalAlpha = 1;
  // the grass thins to sand along the (rounded) edge, in a few soft steps so there's no seam
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, GRASS_RADIUS * U);
  ctx.clip();
  const SHORE_STEPS = [
    { w: 7, alpha: 0.18, colour: "#d9dcaa" },
    { w: 4.5, alpha: 0.4, colour: "#e2dbb2" },
    { w: 2.4, alpha: 0.75, colour: "#eadfbf" },
    { w: 1, alpha: 1, colour: SAND },
  ];
  SHORE_STEPS.forEach(({ w, alpha, colour }) => {
    ctx.filter = `blur(${w * 0.45 * U}px)`;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = w * 2 * U;
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, GRASS_RADIUS * U);
    ctx.stroke();
  });
  ctx.restore();

  const softRect = (x0: number, x1: number, z0: number, z1: number, colour: string, radius: number, blur: number) => {
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(px(x0), pz(z0), (x1 - x0) * U, (z1 - z0) * U, radius * U);
    ctx.fill();
    ctx.restore();
  };
  /** A ragged band of soft discs along a line: an edge worn by feet or water, not ruled */
  const ragged = (points: (readonly [number, number, number])[], colour: string, alpha: number, blur: number) => {
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (const [x, z, r] of points) {
      ctx.moveTo(px(x) + r * U, pz(z));
      ctx.arc(px(x), pz(z), r * U, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  };

  // the stream's banks: damp earth where the grass gives out, wandering in and out, then pebbles
  const bank = STREAM.width / 2;
  const earth: (readonly [number, number, number])[] = [];
  const damp: (readonly [number, number, number])[] = [];
  let n = 0;
  for (const side of [-1, 1]) {
    for (let z = GROUND.z0; z < GROUND.z1; z += 0.55) {
      n++;
      earth.push([STREAM.x + side * (bank + 0.15), z, 0.45 + hash(n, 421) * 0.95]);
      damp.push([STREAM.x + side * bank, z, 0.2 + hash(n, 422) * 0.4]);
    }
  }
  ragged(earth, "#bfae86", 0.85, 5);
  ragged(damp, "#9d8d6c", 0.6, 3);
  const PEBBLES = ["#d8cfbd", "#b6ae9f", "#e6dece", "#a59d8e"];
  for (let i = 0; i < 2600; i++) {
    const side = i % 2 ? 1 : -1;
    const x = STREAM.x + side * (bank + hash(i, 423) ** 2 * 1.5);
    const z = GROUND.z0 + hash(i, 424) * (GROUND.z1 - GROUND.z0);
    ctx.fillStyle = PEBBLES[i % PEBBLES.length];
    ctx.beginPath();
    ctx.ellipse(px(x), pz(z), (0.05 + hash(i, 425) * 0.1) * U, (0.04 + hash(i, 426) * 0.08) * U, hash(i, 427) * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // paths: trodden earth with a ragged edge, laid with worn flagstones two abreast
  for (const [p, path] of PATHS.entries()) {
    const along = path.w > path.d;
    const length = along ? path.w : path.d;
    const across = along ? path.d : path.w;
    /** path-space (t along, s across, both centred) → world */
    const at = (t: number, s: number) => (along ? ([path.x + t, path.z + s] as const) : ([path.x + s, path.z + t] as const));
    const edge: (readonly [number, number, number])[] = [];
    for (let t = -length / 2; t < length / 2; t += 0.6) {
      for (const side of [-1, 1]) {
        n++;
        edge.push([...at(t, side * (across / 2 - 0.1 + hash(n, 431) * 0.35)), 0.3 + hash(n, 432) * 0.5]);
      }
    }
    ragged(edge, "#ad9869", 0.9, 5);
    softRect(path.x - path.w / 2, path.x + path.w / 2, path.z - path.d / 2, path.z + path.d / 2, "#c4ae82", 1.2, 3);
    let course = 0;
    for (let t = -length / 2 + 0.35; t < length / 2 - 0.9; course++) {
      const k = p * 1000 + course;
      const run = 0.95 + hash(k, 433) * 0.75;
      const split = (hash(k, 434) - 0.5) * 0.5;
      const lanes = [
        [-across / 2 + 0.16, split - 0.07],
        [split + 0.07, across / 2 - 0.16],
      ];
      lanes.forEach(([s0, s1], lane) => {
        const j = k * 2 + lane;
        if (hash(j, 435) < 0.08) return; // a stone gone missing here and there
        const [cx, cz] = at(t + run / 2, (s0 + s1) / 2);
        const w = (along ? run : s1 - s0) - 0.06;
        const d = (along ? s1 - s0 : run) - 0.06;
        const tone = 200 + Math.floor(hash(j, 436) * 20);
        ctx.save();
        ctx.translate(px(cx), pz(cz));
        ctx.rotate((hash(j, 437) - 0.5) * 0.12);
        // a dark lower edge first: the stone stands a finger proud of the earth
        ctx.fillStyle = "rgba(128, 108, 76, 0.55)";
        ctx.beginPath();
        ctx.roundRect((-w / 2) * U + 1, (-d / 2) * U + 2, w * U, d * U, 0.24 * U);
        ctx.fill();
        ctx.fillStyle = `rgb(${tone + 12}, ${tone + 4}, ${tone - 14})`;
        ctx.beginPath();
        ctx.roundRect((-w / 2) * U, (-d / 2) * U, w * U, d * U, 0.24 * U);
        ctx.fill();
        ctx.restore();
      });
      t += run + 0.1;
    }
  }
  // gravel specks between the stones
  for (let i = 0; i < 9000; i++) {
    const [x, z] = anywhere(i, 91);
    if (!PATHS.some((p) => Math.abs(x - p.x) < p.w / 2 && Math.abs(z - p.z) < p.d / 2)) continue;
    ctx.fillStyle = hash(i, 93) > 0.5 ? "#a8936a" : "#efe5cc";
    ctx.fillRect(px(x), pz(z), 2, 2);
  }

  // the drum valley's trodden ground and the tower court
  ctx.save();
  ctx.filter = `blur(${3 * U}px)`;
  ctx.fillStyle = "#d6c396";
  ctx.beginPath();
  ctx.ellipse(px(72), pz(0), 17 * U, 15 * U, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d3c8b2";
  ctx.beginPath();
  ctx.arc(px(TOWER.x), pz(TOWER.z), 9 * U, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // each drum presses a darker ring into the dust
  DRUMS.forEach((drum) => {
    const r = (drum.r + 1) * U;
    const g = ctx.createRadialGradient(px(drum.x), pz(drum.z), drum.r * 0.7 * U, px(drum.x), pz(drum.z), r);
    g.addColorStop(0, "rgba(120, 98, 62, 0.4)");
    g.addColorStop(1, "rgba(120, 98, 62, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(px(drum.x) - r, pz(drum.z) - r, r * 2, r * 2);
  });
  // the court is cobbled in rings round the tower, fading out into the grass
  ctx.save();
  ctx.lineCap = "butt";
  [5.3, 6.25, 7.2, 8.15].forEach((r, ring) => {
    ctx.globalAlpha = 0.95 - ring * 0.2;
    ctx.strokeStyle = ring % 2 ? "#e3dac6" : "#d9cfb9";
    ctx.lineWidth = 0.85 * U;
    ctx.setLineDash([(1.1 + ring * 0.07) * U, 0.12 * U]);
    ctx.lineDashOffset = ring * 6;
    ctx.beginPath();
    ctx.arc(px(TOWER.x), pz(TOWER.z), r * U, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();

  // the plaza's flower beds: dark soil inside a kerb of pale stones
  ctx.save();
  ctx.lineCap = "butt";
  FLOWER_BEDS.forEach((bed, b) => {
    const trace = () => {
      ctx.beginPath();
      ctx.roundRect(px(bed.x - bed.w / 2), pz(bed.z - bed.d / 2), bed.w * U, bed.d * U, 0.8 * U);
    };
    ctx.setLineDash([]);
    trace();
    ctx.fillStyle = "#7f6346";
    ctx.fill();
    ctx.strokeStyle = "#9c8f76";
    ctx.lineWidth = 0.44 * U;
    ctx.stroke();
    ctx.strokeStyle = "#ddd3bf";
    ctx.lineWidth = 0.3 * U;
    ctx.setLineDash([0.62 * U, 0.08 * U]);
    ctx.lineDashOffset = b * 3;
    trace();
    ctx.stroke();
  });
  ctx.restore();

  // the keyboard plaza: a worn border, a kerb of long stones, then pale paving slabs in a running bond
  softRect(-35, 35, -9.5, 15.5, "#c9bca3", 6.5, 4);
  softRect(-34, 34, -9, 15, "#b9ad95", 6, 1);
  ctx.save();
  ctx.lineCap = "butt";
  ctx.strokeStyle = "#ded4c0";
  ctx.lineWidth = 0.62 * U;
  ctx.setLineDash([1.7 * U, 0.07 * U]);
  ctx.beginPath();
  ctx.roundRect(px(-33.62), pz(-8.62), 67.24 * U, 23.24 * U, 5.7 * U);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px(-33.2), pz(-8.2), 66.4 * U, 22.4 * U, 5.4 * U);
  ctx.clip();
  ctx.fillStyle = "#e0d7c5";
  ctx.fillRect(px(-34), pz(-9), 68 * U, 24 * U);
  const SLAB = 2;
  for (let row = 0, z = -8.2; z < 14.2; row++, z += SLAB) {
    for (let x = -33.2 - (row % 2) * (SLAB / 2); x < 33.2; x += SLAB) {
      const tone = 236 + Math.floor(hash(row * 131 + Math.round(x * 7), 61) * 14);
      ctx.fillStyle = `rgb(${tone + 6}, ${tone + 1}, ${tone - 9})`;
      ctx.fillRect(px(x) + 1, pz(z) + 1, SLAB * U - 2, SLAB * U - 2);
    }
  }
  // an inlaid stave across the open front of the plaza, with a few notes resting on it
  const STAVE = { x0: -22, x1: 22, z: 10.2, gap: 0.45 };
  ctx.strokeStyle = "#c4b597";
  ctx.lineWidth = 0.12 * U;
  for (let line = 0; line < 5; line++) {
    ctx.beginPath();
    ctx.moveTo(px(STAVE.x0), pz(STAVE.z + line * STAVE.gap));
    ctx.lineTo(px(STAVE.x1), pz(STAVE.z + line * STAVE.gap));
    ctx.stroke();
  }
  ctx.fillStyle = "#b9a888";
  [[-14, 3], [-10, 2], [-6, 4], [-2, 1], [3, 3], [7, 2], [11, 0], [15, 2]].forEach(([x, step]) => {
    ctx.beginPath();
    ctx.ellipse(px(x), pz(STAVE.z + (4 - step) * STAVE.gap), 0.32 * U, 0.22 * U, -0.35, 0, Math.PI * 2);
    ctx.fill();
  });
  // the great keyboard's weight on the paving: a soft shade round its case, so it rests
  // on the plaza even where no shadows are drawn
  const keys = keySpan();
  const caseHalf = (WHITE_L + 0.9) / 2;
  softRect(keys.left - 1, keys.right + 1, -0.15 - caseHalf - 0.5, -0.15 + caseHalf + 0.9, "rgba(104, 90, 68, 0.3)", 0.7, 7);
  ctx.restore();

  // a round stone footing under each lamp post
  LAMPS.forEach((lamp) => {
    ctx.fillStyle = "#a99d86";
    ctx.beginPath();
    ctx.arc(px(lamp.x), pz(lamp.z), 0.5 * U, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d6ccb8";
    ctx.beginPath();
    ctx.arc(px(lamp.x), pz(lamp.z), 0.4 * U, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // the shape's UVs are world x / −z: map the whole canvas over the island once
  texture.repeat.set(1 / (GROUND.x1 - GROUND.x0), 1 / (GROUND.z1 - GROUND.z0));
  texture.offset.set(-GROUND.x0 / (GROUND.x1 - GROUND.x0), GROUND.z1 / (GROUND.z1 - GROUND.z0));
  return texture;
}

/** Shore parameters for the water shaders (stable objects: they key the materials) */
const SEA_SHORE: [number, number, number, number] = [SEA.halfX, SEA.zMin, SEA.zMax, SEA.radius];
const STREAM_SHORE: [number, number, number, number] = [STREAM.x, STREAM.width / 2, BRIDGE_RAIL_Z, 0];

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
      <Water kind="sea" geometry={assets.sea} shore={SEA_SHORE} position={[0, SEA.level, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} geometry={assets.beach} material={assets.sand} receiveShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} geometry={assets.grass} receiveShadow>
        <meshStandardMaterial map={assets.painted} roughness={1} />
      </mesh>
      {/* the stream, banks to the sea */}
      <Water kind="stream" geometry={assets.stream} shore={STREAM_SHORE} position={[STREAM.x, STREAM_LEVEL, (STREAM.zMin + STREAM.zMax) / 2]} />
    </group>
  );
}
