"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  AMEN,
  LIGHT_POOLS,
  POOL_OF_MIDI,
  POOL_SIZE,
  ROSETTE,
  cathedralRuntime,
  poolGlow,
  resetAmen,
} from "../engine/cathedral";
import { decorFor } from "../engine/decor";

/**
 * The cathedral's light (engine/cathedral.ts): pools of stained glass on the
 * floor behind the colonnade, the shafts they fall down, dust turning in
 * them, candles on the column plinths, and the rose window's rosette.
 *
 * No real lights: everything here is unlit, blended over the floor, and
 * instanced — six draw calls for the lot.
 */
export function CathedralDecor({ pressed }: { pressed: RefObject<Set<number>> }) {
  // a fresh phrase each visit
  useEffect(() => resetAmen(), []);
  return (
    <group>
      <LightPools pressed={pressed} />
      <Shafts />
      <Motes />
      <Candles />
      <Rosette />
    </group>
  );
}

/** How long a pool takes to fade after its note stops (seconds): it rings on, like the organ */
const POOL_FADE = 1.6;
/** Shafts rise from each pool back up to its window */
const SHAFT_RISE = 14;
const SHAFT_BACK = 8;
const SHAFT_LENGTH = Math.hypot(SHAFT_RISE, SHAFT_BACK);
const SHAFT_TILT = Math.atan2(SHAFT_BACK, SHAFT_RISE);

// --- shaders shared by the pools, the shafts and the rosette

const VERTEX = /* glsl */ `
  attribute float aGlow;
  attribute float aHue;
  varying vec2 vUv;
  varying float vGlow;
  varying float vHue;
  void main() {
    vUv = uv;
    #ifdef USE_INSTANCING
      vGlow = aGlow;
      vHue = aHue;
      vec4 local = instanceMatrix * vec4(position, 1.0);
    #else
      vGlow = 0.0;
      vHue = 0.0;
      vec4 local = vec4(position, 1.0);
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * local;
  }
`;

const HUE = /* glsl */ `
  vec3 hue(float h) {
    return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  }
`;

/** Window light on stone: pastel panes, brighter and deeper while a note rings above */
const POOL_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying float vGlow;
  varying float vHue;
  ${HUE}
  void main() {
    vec4 pane = texture2D(uMap, vUv);
    vec3 glass = mix(vec3(1.0), hue(vHue + (pane.g - 0.5) * 0.3), 0.6 + 0.25 * vGlow);
    glass *= 0.8 + 0.2 * pane.r;
    glass = mix(glass, vec3(1.0, 0.97, 0.88), 0.2 * vGlow);
    float alpha = pane.a * (0.2 + 0.55 * vGlow);
    gl_FragColor = vec4(glass, alpha);
    #include <colorspace_fragment>
  }
`;

/** A soft beam: fades at both ends and both sides, a little brighter while its pool rings */
const SHAFT_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  varying float vGlow;
  varying float vHue;
  ${HUE}
  void main() {
    float side = smoothstep(0.0, 0.35, vUv.x) * smoothstep(1.0, 0.65, vUv.x);
    float along = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.5, vUv.y);
    vec3 tint = mix(vec3(1.0, 0.96, 0.86), hue(vHue), 0.25);
    gl_FragColor = vec4(tint, side * along * (0.07 + 0.16 * vGlow));
    #include <colorspace_fragment>
  }
`;

/** The rose: a quadrant per note of the phrase, lit as it is played; a ring of light runs out when it opens */
const ROSETTE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec4 uLit;
  uniform float uBloom;
  uniform float uSince;
  varying vec2 vUv;
  void main() {
    vec4 glass = texture2D(uMap, vUv);
    vec2 p = vUv - 0.5;
    // quadrants clockwise from the far side (top of the screen): C, E, G, C
    float turn = mod(1.5707963 - atan(p.y, p.x), 6.2831853) / 1.5707963;
    float q = floor(mod(turn + 0.5, 4.0));
    float lit = q < 0.5 ? uLit.x : q < 1.5 ? uLit.y : q < 2.5 ? uLit.z : uLit.w;
    float r = length(p) * 2.0;
    // squared by hand: GLSL leaves pow() undefined for a negative base, which is
    // everywhere inside the ring once it has passed
    float off = (r - uSince * 0.7) * 5.0;
    float ring = uBloom * exp(-off * off);
    float level = clamp(0.24 + 0.6 * lit + 0.25 * uBloom + 0.5 * ring, 0.0, 1.0);
    vec3 colour = mix(glass.rgb, vec3(1.0, 0.98, 0.9), 0.15 * lit + 0.45 * ring);
    gl_FragColor = vec4(colour, glass.a * level);
    #include <colorspace_fragment>
  }
`;

/** A deterministic 0–1 hash, so the glass is the same pattern every visit */
function hash(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** A lancet window's light: arched panes, the lead between them left dark */
function drawLancet(): THREE.CanvasTexture {
  const w = 128;
  const h = 192;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const arch = new Path2D();
  arch.moveTo(6, h - 6);
  arch.lineTo(6, 64);
  arch.arc(w / 2, 64, w / 2 - 6, Math.PI, 0);
  arch.lineTo(w - 6, h - 6);
  arch.closePath();
  ctx.save();
  ctx.clip(arch);
  // R: how bright a pane is, G: how far its hue leans from the window's own
  const rows = 6;
  const cell = (h - 64) / rows;
  for (let row = -2; row < rows; row++) {
    for (let col = 0; col < 2; col++) {
      const i = (row + 2) * 2 + col;
      ctx.fillStyle = `rgb(${Math.round(hash(i, 1) * 255)}, ${Math.round(hash(i, 2) * 255)}, 255)`;
      ctx.fillRect(col * (w / 2), 64 + row * cell, w / 2, cell);
    }
  }
  ctx.restore();
  // the lead: cut back out to the floor beneath
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(w / 2, 20);
  ctx.lineTo(w / 2, h);
  for (let row = 0; row <= rows; row++) {
    ctx.moveTo(0, 64 + row * cell);
    ctx.lineTo(w, 64 + row * cell);
  }
  ctx.stroke();
  // a finer diamond lattice across the panes, so it reads as glass and not as rungs
  const run = h - 64;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = -run; k < w + run; k += 22) {
    ctx.moveTo(k, 64);
    ctx.lineTo(k + run, h);
    ctx.moveTo(k, 64);
    ctx.lineTo(k - run, h);
  }
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w / 2, 46, 16, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  // data, not colour: R and G steer the shader
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

/** Pools on the floor, each brightening while a note rings on a key in front of it */
function LightPools({ pressed }: { pressed: RefObject<Set<number>> }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const map = useMemo(() => drawLancet(), []);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(POOL_SIZE.width, POOL_SIZE.length);
    g.rotateX(-Math.PI / 2);
    g.setAttribute("aGlow", new THREE.InstancedBufferAttribute(new Float32Array(LIGHT_POOLS.length), 1));
    g.setAttribute("aHue", new THREE.InstancedBufferAttribute(Float32Array.from(LIGHT_POOLS, (p) => p.hue), 1));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: POOL_FRAGMENT,
        uniforms: { uMap: { value: map } },
        transparent: true,
        depthWrite: false,
      }),
    [map],
  );
  useEffect(
    () => () => {
      map.dispose();
      geometry.dispose();
      material.dispose();
    },
    [map, geometry, material],
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new THREE.Matrix4();
    LIGHT_POOLS.forEach((pool, i) => m.setMatrixAt(i, matrix.makeTranslation(pool.x, 0.015, pool.z)));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);

  useFrame(({ clock }, delta) => {
    const m = mesh.current;
    if (!m) return;
    const levels = poolGlow;
    const now = clock.getElapsedTime();
    const sinceBloom = now - cathedralRuntime.bloomAt;
    for (let i = 0; i < levels.length; i++) levels[i] = Math.max(0, levels[i] - delta / POOL_FADE);
    for (const midi of pressed.current) {
      const i = POOL_OF_MIDI.get(midi);
      if (i !== undefined) levels[i] = 1;
    }
    // when the rose opens, a wave of light runs out from it along the windows
    if (sinceBloom < 4) {
      LIGHT_POOLS.forEach((pool, i) => {
        const reach = Math.abs(pool.x - ROSETTE.x) - sinceBloom * 22;
        levels[i] = Math.max(levels[i], Math.exp(-(reach * reach) / 40));
      });
    }
    copyGlow(m);
  });

  return <instancedMesh ref={mesh} args={[geometry, material, LIGHT_POOLS.length]} frustumCulled={false} />;
}

/** Hand the pools' current brightness to an instanced mesh's aGlow */
function copyGlow(mesh: THREE.InstancedMesh) {
  const attribute = mesh.geometry.getAttribute("aGlow") as THREE.InstancedBufferAttribute;
  (attribute.array as Float32Array).set(poolGlow);
  attribute.needsUpdate = true;
}

/** The light falling to each pool from its window, high and behind */
function Shafts() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(POOL_SIZE.width * 0.8, SHAFT_LENGTH);
    // pivot at the floor end, then lean back toward the window
    g.translate(0, SHAFT_LENGTH / 2, 0);
    g.rotateX(-SHAFT_TILT);
    g.setAttribute("aGlow", new THREE.InstancedBufferAttribute(new Float32Array(LIGHT_POOLS.length), 1));
    g.setAttribute("aHue", new THREE.InstancedBufferAttribute(Float32Array.from(LIGHT_POOLS, (p) => p.hue), 1));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: SHAFT_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new THREE.Matrix4();
    LIGHT_POOLS.forEach((pool, i) => m.setMatrixAt(i, matrix.makeTranslation(pool.x, 0, pool.z)));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);

  useFrame(() => {
    if (mesh.current) copyGlow(mesh.current);
  });

  return <instancedMesh ref={mesh} args={[geometry, material, LIGHT_POOLS.length]} frustumCulled={false} />;
}

const MOTE_COUNT = 160;

/** Dust turning slowly in the shafts; it glitters when the rose opens */
function Motes() {
  const points = useRef<THREE.Points>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: MOTE_COUNT }, (_, i) => {
        const pool = LIGHT_POOLS[Math.floor(hash(i, 3) * LIGHT_POOLS.length)];
        const along = hash(i, 4) * 0.7;
        return {
          x: pool.x + (hash(i, 5) - 0.5) * POOL_SIZE.width * 0.7,
          y: 0.4 + along * SHAFT_RISE,
          z: pool.z - along * SHAFT_BACK,
          speed: 0.15 + hash(i, 6) * 0.3,
          phase: hash(i, 7) * Math.PI * 2,
        };
      }),
    [],
  );
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTE_COUNT * 3), 3));
    return g;
  }, []);
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.6)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);
  const material = useRef<THREE.PointsMaterial>(null);
  useEffect(
    () => () => {
      geometry.dispose();
      map.dispose();
    },
    [geometry, map],
  );

  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.getElapsedTime();
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = position.array as Float32Array;
    seeds.forEach((s, i) => {
      // drifts down a little and turns, the way dust hangs in a sunbeam
      const fall = ((t * s.speed * 0.15 + s.phase) % 1) * 0.8;
      array[i * 3] = s.x + Math.sin(t * s.speed + s.phase) * 0.35;
      array[i * 3 + 1] = s.y - fall;
      array[i * 3 + 2] = s.z + Math.cos(t * s.speed * 0.8 + s.phase) * 0.35;
    });
    position.needsUpdate = true;
    if (material.current) {
      const since = t - cathedralRuntime.bloomAt;
      const sparkle = since < 6 ? 1 - since / 6 : 0;
      material.current.size = 0.11 + 0.08 * sparkle;
      material.current.opacity = 0.75 + 0.25 * sparkle;
    }
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={material}
        map={map}
        color="#fff6dc"
        size={0.11}
        transparent
        opacity={0.75}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

/** Plinths are 1.3 across and 0.3 high (region-decor.tsx): a candle on each front corner */
const PLINTH_TOP = 0.3;
const CANDLE_OFFSET = 0.48;

/** Candles on the column plinths, their flames trembling */
function Candles() {
  const spots = useMemo(
    () =>
      decorFor("cathedral")
        .filter((item) => item.kind === "column")
        .flatMap((column, i) =>
          [-1, 1].map((side, j) => ({
            x: column.x + side * CANDLE_OFFSET,
            z: column.z + CANDLE_OFFSET,
            height: 0.28 + hash(i * 2 + j, 8) * 0.22,
            phase: hash(i * 2 + j, 9) * 10,
          })),
        ),
    [],
  );
  const bodies = useRef<THREE.InstancedMesh>(null);
  const flames = useRef<THREE.InstancedMesh>(null);
  const scratch = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const m = bodies.current;
    if (!m) return;
    spots.forEach((spot, i) => {
      scratch.position.set(spot.x, PLINTH_TOP + spot.height / 2, spot.z);
      scratch.scale.set(1, spot.height, 1);
      scratch.updateMatrix();
      m.setMatrixAt(i, scratch.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [spots, scratch]);

  useFrame(({ clock }) => {
    const m = flames.current;
    if (!m) return;
    const t = clock.getElapsedTime();
    spots.forEach((spot, i) => {
      const flicker = 0.85 + 0.15 * Math.sin(t * 13 + spot.phase) * Math.sin(t * 7.3 + spot.phase * 2);
      scratch.position.set(spot.x, PLINTH_TOP + spot.height + 0.07 * flicker, spot.z);
      scratch.scale.set(0.05, 0.09 * flicker, 0.05);
      scratch.updateMatrix();
      m.setMatrixAt(i, scratch.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, spots.length]} castShadow={false}>
        <cylinderGeometry args={[0.055, 0.06, 1, 10]} />
        <meshStandardMaterial color="#f4ead2" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={flames} args={[undefined, undefined, spots.length]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#ffc861" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/** One hue per pane of the phrase: amber C, rose E, blue G, violet C */
const PANE_HUES = [42, 345, 210, 270];
const PANE_NAMES = ["C", "E", "G", "C"];

/** The rose window's light: tracery in four quadrants, each named for its note */
function drawRose(): THREE.CanvasTexture {
  const size = 512;
  const c = size / 2;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const quarter = Math.PI / 2;
  // canvas angles run clockwise from +x; the far side of the floor is the canvas top
  const centreOf = (q: number) => -quarter + q * quarter;

  PANE_HUES.forEach((hue, q) => {
    const mid = centreOf(q);
    ctx.fillStyle = `hsl(${hue} 70% 72%)`;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, 236, mid - quarter / 2, mid + quarter / 2);
    ctx.closePath();
    ctx.fill();
    // two petals per quadrant
    ctx.fillStyle = `hsl(${hue} 80% 84%)`;
    for (const lean of [-1, 1]) {
      const a = mid + (lean * quarter) / 4;
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(a) * 192, c + Math.sin(a) * 192, 40, 22, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `hsl(${hue} 60% 60%)`;
    ctx.beginPath();
    ctx.arc(c, c, 140, mid - quarter / 2, mid + quarter / 2);
    ctx.arc(c, c, 62, mid + quarter / 2, mid - quarter / 2, true);
    ctx.closePath();
    ctx.fill();
  });
  ctx.fillStyle = "hsl(45 90% 80%)";
  ctx.beginPath();
  ctx.arc(c, c, 62, 0, Math.PI * 2);
  ctx.fill();

  // the lead
  ctx.globalCompositeOperation = "destination-out";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 7;
  for (const r of [62, 140, 150, 236]) {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 5;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 + Math.PI / 16;
    const from = i % 2 === 0 ? 62 : 150;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * from, c + Math.sin(a) * from);
    ctx.lineTo(c + Math.cos(a) * 236, c + Math.sin(a) * 236);
    ctx.stroke();
  }

  // each quadrant's note, in bright glass
  ctx.globalCompositeOperation = "source-over";
  ctx.font = "700 64px Pretendard Variable, Pretendard, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 8;
  PANE_NAMES.forEach((name, q) => {
    const a = centreOf(q);
    const x = c + Math.cos(a) * 101;
    const y = c + Math.sin(a) * 101;
    ctx.strokeStyle = `hsl(${PANE_HUES[q]} 45% 38%)`;
    ctx.strokeText(name, x, y);
    ctx.fillStyle = "#fffaf0";
    ctx.fillText(name, x, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** How fast a pane eases on or off */
const PANE_EASE = 5;
/** Seconds since the bloom, as far as the shader needs to count (its ring is long gone by then) */
const ROSE_SINCE_CAP = 99;

function Rosette() {
  const map = useMemo(() => drawRose(), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: ROSETTE_FRAGMENT,
        uniforms: {
          uMap: { value: map },
          uLit: { value: new THREE.Vector4() },
          uBloom: { value: 0 },
          uSince: { value: ROSE_SINCE_CAP },
        },
        transparent: true,
        depthWrite: false,
      }),
    [map],
  );
  useEffect(
    () => () => {
      map.dispose();
      material.dispose();
    },
    [map, material],
  );

  const mesh = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    const shader = mesh.current?.material as THREE.ShaderMaterial | undefined;
    if (!shader) return;
    const now = clock.getElapsedTime();
    const since = now - cathedralRuntime.bloomAt;
    // open: every pane full for a while, then settling back
    const bloom = since < 2 ? 1 : since < 8 ? 1 - (since - 2) / 6 : 0;
    const lit = shader.uniforms.uLit.value as THREE.Vector4;
    const ease = Math.min(1, delta * PANE_EASE);
    for (let q = 0; q < AMEN.length; q++) {
      const goal = Math.max(q < cathedralRuntime.progress ? 1 : 0, bloom);
      lit.setComponent(q, lit.getComponent(q) + (goal - lit.getComponent(q)) * ease);
    }
    shader.uniforms.uBloom.value = bloom;
    // before the first bloom `since` is Infinity, which a float uniform shouldn't carry
    shader.uniforms.uSince.value = Math.min(since, ROSE_SINCE_CAP);
  });

  return (
    <mesh ref={mesh} position={[ROSETTE.x, 0.02, ROSETTE.z]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <circleGeometry args={[ROSETTE.radius, 64]} />
    </mesh>
  );
}
