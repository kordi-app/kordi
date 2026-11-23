"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  CASE_THICKNESS,
  CRUMBLE_DELAY,
  CRUMBLE_DOWN_TIME,
  PLATFORM_THICKNESS,
  BEAM_LAMP_ABOVE,
  alwaysLit,
  beamLight,
  beamWidthAt,
  beamX,
  goalSpots,
  courseRuntime,
  isSolid,
  slideOffset,
  type Beam,
  type CourseDef,
  type Platform,
} from "../engine/course";
import { CrownMesh } from "@/entities/character";
import { useKeySprings } from "./hooks/use-key-springs";

const COLORS: Record<Platform["kind"], string> = {
  white: "#fbf8f2",
  black: "#24201c",
  rest: "#f1e7d2",
  goal: "#e3b341",
};

/** Terrain with a behavior gets its own colour so you can read it before stepping on it. */
const BEHAVIOR_COLORS: Record<NonNullable<Platform["behavior"]>, string> = {
  slide: "#cfe2ff", // airy blue: it moves
  crumble: "#e8cfa6", // sandy: it won't hold
  bounce: "#ff9ec0", // rubbery pink: it springs
};

const FALL_SPEED = 6;
const PRESSED_GLOW = { day: new THREE.Color("#b9a8ff"), night: new THREE.Color("#ffe9a8") };
const BEAM_COLOR = "#fff1c4";
const LANTERN_COLOR = "#ffcf7a";
/** How fast a step fades in and out of the dark (per second, exponential). */
const FADE_RATE = 14;

/** Deterministic noise so clouds and stars stay put between renders. */
function hash(i: number, salt: number) {
  const x = Math.sin(i * 57.3 + salt * 19.1) * 43758.5453;
  return x - Math.floor(x);
}

/** One cloud's puffs, in cloud space: [x, y, z, radius]. The low, wide ones flatten its belly. */
const PUFFS = [
  [0, 0, 0, 1],
  [0.9, -0.15, 0.1, 0.75],
  [-0.9, -0.2, -0.1, 0.7],
  [0.35, 0.35, -0.2, 0.65],
  [-0.3, 0.22, 0.25, 0.55],
  [0.1, -0.38, 0, 1.15],
] as const;
const CLOUD_TOP = new THREE.Color("#ffffff");
const CLOUD_BELLY = new THREE.Color("#dfe7f4");

/**
 * The cloud backdrop: every puff of every cloud in one instanced mesh (one
 * draw call). Puffs lower in a cloud are tinted a touch blue-grey, so each
 * cloud reads as lit from above rather than as flat white blobs.
 */
function Clouds({ clouds }: { clouds: readonly { x: number; y: number; z: number; scale: number }[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = clouds.length * PUFFS.length;
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    clouds.forEach((c, ci) => {
      PUFFS.forEach(([px, py, pz, r], pi) => {
        const i = ci * PUFFS.length + pi;
        matrix
          .makeScale(r * c.scale, r * 0.62 * c.scale, r * c.scale)
          .setPosition(c.x + px * c.scale, c.y + py * c.scale, c.z + pz * c.scale);
        m.setMatrixAt(i, matrix);
        m.setColorAt(i, color.copy(CLOUD_BELLY).lerp(CLOUD_TOP, THREE.MathUtils.clamp((py + 0.4) / 0.75, 0, 1)));
      });
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [clouds]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

/** The goal's treasure: a chest with a crown hovering over it (just the chest once you own that crown). */
function Treasure({ x, y, z, star, crown: showCrown }: { x: number; y: number; z: number; star: boolean; crown: boolean }) {
  const crown = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // the lid breathes open a crack, letting the glow inside peek out
    if (lid.current) lid.current.rotation.x = -(0.16 + Math.max(0, Math.sin(t * 1.4)) * 0.14);
    if (!crown.current) return;
    crown.current.rotation.y = t * 1.2;
    crown.current.position.y = 1.35 + Math.sin(t * 2) * 0.12;
  });
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.9, 0.6, 0.6]} />
        <meshStandardMaterial color="#8a5a2b" roughness={0.6} />
      </mesh>
      {/* gold corner bands and a lock plate */}
      {[-0.36, 0.36].map((bx) => (
        <mesh key={bx} position={[bx, 0.3, 0]}>
          <boxGeometry args={[0.07, 0.62, 0.62]} />
          <meshStandardMaterial color="#e3b341" metalness={0.45} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.48, 0.305]}>
        <boxGeometry args={[0.16, 0.2, 0.03]} />
        <meshStandardMaterial color="#e3b341" metalness={0.45} roughness={0.3} />
      </mesh>
      {/* treasure light inside, seen through the open crack */}
      <mesh position={[0, 0.595, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.82, 0.52]} />
        <meshBasicMaterial color="#ffe08a" toneMapped={false} />
      </mesh>
      {/* the rounded lid, hinged along the back edge */}
      <group ref={lid} position={[0, 0.6, -0.3]}>
        <mesh position={[0, 0, 0.3]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.94, 16, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#8a5a2b" roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
        {[-0.36, 0.36].map((bx) => (
          <mesh key={bx} position={[bx, 0, 0.3]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.315, 0.315, 0.08, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#e3b341" metalness={0.45} roughness={0.3} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {showCrown ? (
        <group ref={crown}>
          <CrownMesh kind={star ? "star" : "gold"} />
        </group>
      ) : null}
    </group>
  );
}

/** Soft white texture with alpha `f(u, v)` (both 0–1 → 0–1). */
function makeAlphaTexture(f: (u: number, v: number) => number) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const alpha = f(px / (size - 1), 1 - py / (size - 1));
      const o = (py * size + px) * 4;
      image.data[o] = image.data[o + 1] = image.data[o + 2] = 255;
      image.data[o + 3] = Math.round(alpha * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Fake volumetric light on a cone: bright where you look straight through it,
 * fading to nothing where its surface turns edge-on, so the shaft has no hard
 * outline. Brightest near the lamp, thinning toward the water.
 */
const SHAFT_VERTEX = /* glsl */ `
  uniform float uHeight;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vUp;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = -mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    vUp = position.y / uHeight + 0.5;
    gl_Position = projectionMatrix * mv;
  }
`;
const SHAFT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vUp;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float body = pow(facing, 2.2);
    float fall = mix(0.3, 1.0, pow(vUp, 1.4));
    gl_FragColor = vec4(uColor, body * fall * uOpacity);
    #include <colorspace_fragment>
  }
`;

/**
 * A searchlight: a cone of light from a lamp above the course, swinging with
 * the same clock the physics reads. The cone's width at each height is
 * beamWidthAt — what you see lit is exactly what will hold you.
 */
function Searchlight({ beam, course, pool }: { beam: Beam; course: CourseDef; pool: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const top = course.platforms[course.goalIndex].y;
  const height = top + BEAM_LAMP_ABOVE;
  const radiusTop = beamWidthAt(course, beam, height) / 2;
  const radiusBottom = beamWidthAt(course, beam, 0) / 2;

  const shaft = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 48, 1, true);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(BEAM_COLOR) },
        uOpacity: { value: 0.32 },
        uHeight: { value: height },
      },
      vertexShader: SHAFT_VERTEX,
      fragmentShader: SHAFT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    return { geometry, material };
  }, [radiusTop, radiusBottom, height]);
  useEffect(
    () => () => {
      shaft.geometry.dispose();
      shaft.material.dispose();
    },
    [shaft],
  );

  useFrame(() => {
    if (group.current) group.current.position.x = beamX(beam, courseRuntime.time);
  });
  return (
    <group ref={group}>
      {/* the shaft, centred between the two rows of steps */}
      <mesh position={[0, height / 2, -1.3]} geometry={shaft.geometry} material={shaft.material} />
      {/* where it meets the water: a soft pool of light */}
      <mesh position={[0, 0.02, -1.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[radiusBottom * 2.2, radiusBottom * 2.2, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={pool}
          color={BEAM_COLOR}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* the lamp it hangs from: a wide floodlight with a glowing lens */}
      <mesh position={[0, height + 0.3, -1.3]}>
        <cylinderGeometry args={[radiusTop * 0.7, radiusTop * 1.05, 0.6, 32]} />
        <meshStandardMaterial color="#20243a" />
      </mesh>
      <mesh position={[0, height - 0.01, -1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radiusTop, 32]} />
        <meshBasicMaterial color={BEAM_COLOR} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Night backdrop: stars that ignore the fog, and a moon. */
function NightSky() {
  const geometry = useMemo(() => {
    const COUNT = 420;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (hash(i, 11) - 0.5) * 140;
      positions[i * 3 + 1] = hash(i, 12) * 60 - 4;
      positions[i * 3 + 2] = -30 - hash(i, 13) * 20;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const stars = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    const material = stars.current?.material as THREE.PointsMaterial | undefined;
    if (material) material.opacity = 0.75 + Math.sin(clock.getElapsedTime() * 1.7) * 0.15; // a slow twinkle
  });

  return (
    <group>
      <points ref={stars} geometry={geometry}>
        <pointsMaterial color="#ffffff" size={0.22} sizeAttenuation transparent fog={false} depthWrite={false} />
      </points>
      <mesh position={[16, 26, -34]}>
        <sphereGeometry args={[2.4, 32, 24]} />
        <meshBasicMaterial color="#fff4d6" fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[16, 26, -34.5]}>
        <circleGeometry args={[6, 48]} />
        <meshBasicMaterial color="#9fb0ff" transparent opacity={0.12} fog={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** A little lantern on a landing: the night course's safe spots carry their own light. */
function Lantern({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
        <meshStandardMaterial color="#2a2a3a" />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshBasicMaterial color={LANTERN_COLOR} toneMapped={false} />
      </mesh>
      {/* a little cap and collar, so it reads as a lamp rather than a ball on a stick */}
      <mesh position={[0, 1.16, 0]}>
        <coneGeometry args={[0.17, 0.14, 6]} />
        <meshStandardMaterial color="#2a2a3a" />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.08, 0.06, 0.06, 8]} />
        <meshStandardMaterial color="#2a2a3a" />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshBasicMaterial color={LANTERN_COLOR} transparent opacity={0.14} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * A jump course: floating keys going up. The cloud course sits over a cloud
 * sea in daylight; the night course over dark water under stars, where steps
 * only show — and only hold — while a searchlight is on them.
 */
export const CourseScene = memo(function CourseScene({
  course,
  pressed,
  rewardOwned,
}: {
  course: CourseDef;
  /** keys held down right now; read every frame */
  pressed: RefObject<ReadonlySet<number>>;
  /** you already have this course's crown: the treasure shows no crown */
  rewardOwned: boolean;
}) {
  const { platforms, beams } = course;
  const night = beams !== undefined;
  const clouds = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        x: (hash(i, 1) - 0.5) * 50,
        y: 2 + hash(i, 2) * 26,
        z: -8 - hash(i, 3) * 14,
        scale: 1.2 + hash(i, 4) * 2.2,
      })),
    [],
  );
  // round, soft-edged glow for where a searchlight meets the water
  const poolTexture = useMemo(
    () => makeAlphaTexture((u, v) => Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 2) ** 1.6),
    [],
  );
  useEffect(() => () => poolTexture.dispose(), [poolTexture]);
  const outlines = useMemo(
    () =>
      platforms.map((p) => {
        const box = new THREE.BoxGeometry(p.width, PLATFORM_THICKNESS, p.depth);
        const edges = new THREE.EdgesGeometry(box);
        box.dispose();
        return edges;
      }),
    [platforms],
  );
  useEffect(() => () => outlines.forEach((g) => g.dispose()), [outlines]);
  // the same boxes as before, with softened edges (same bounds: the top is exactly where you land)
  const shapes = useMemo(
    () =>
      platforms.map((p) => ({
        top: new RoundedBoxGeometry(p.width, PLATFORM_THICKNESS, p.depth, 2, 0.07),
        base: new RoundedBoxGeometry(p.width + 0.16, CASE_THICKNESS, p.depth + 0.16, 2, 0.05),
      })),
    [platforms],
  );
  useEffect(
    () => () =>
      shapes.forEach(({ top, base }) => {
        top.dispose();
        base.dispose();
      }),
    [shapes],
  );

  const platformGroups = useRef<(THREE.Group | null)[]>([]);
  /** each step's top slab, for the pressed glow */
  const tops = useRef<(THREE.Mesh | null)[]>([]);
  /** each step's resting glow (lanterns, the goal), restored when it's let go */
  const restGlow = useMemo(
    () =>
      platforms.map((p) => {
        const lantern = night && alwaysLit(p);
        return {
          colour: new THREE.Color(lantern ? LANTERN_COLOR : p.kind === "goal" ? "#a06a00" : night ? BEAM_COLOR : "#000000"),
          intensity: lantern ? 0.35 : p.kind === "goal" ? 0.3 : 0,
        };
      }),
    [platforms, night],
  );
  /** smoothed 0–1 visibility per step on the night course */
  const levels = useRef(platforms.map(() => 0));

  // slide, wobble, drop and light platforms from the same runtime the physics reads
  useFrame((_, rawDelta) => {
    const t = courseRuntime.time;
    const fade = 1 - Math.exp(-Math.min(rawDelta, 0.05) * FADE_RATE);
    platformGroups.current.forEach((group, i) => {
      if (!group) return;
      const p = platforms[i];
      let x = slideOffset(course, i, t);
      let y = 0;
      const wobbleSince = courseRuntime.crumbling.get(i);
      if (wobbleSince !== undefined) {
        // shake harder the closer it is to giving way
        const urgency = Math.min(1, (t - wobbleSince) / CRUMBLE_DELAY);
        x += Math.sin(t * 60) * 0.04 * urgency;
      }
      const backAt = courseRuntime.fallenUntil.get(i);
      group.visible = true;
      if (backAt !== undefined) {
        const fallen = t - (backAt - CRUMBLE_DOWN_TIME);
        y = -fallen * fallen * FALL_SPEED;
        group.visible = y > -12; // gone once it's dropped well out of view
      }
      group.position.set(x, y, 0);

      // stepped on: glow (lit steps at night keep their light-driven intensity below)
      const top = tops.current[i];
      const down = pressed.current.has(p.midi);
      if (top) {
        const material = top.material as THREE.MeshStandardMaterial;
        material.emissive.copy(down ? PRESSED_GLOW[night ? "night" : "day"] : restGlow[i].colour);
        material.emissiveIntensity = down ? 0.6 : restGlow[i].intensity;
      }

      if (!night || alwaysLit(p)) return;
      // lit: full; in the grace window after the light leaves: half, as a warning; dark: gone
      const light = Math.max(0, beamLight(course, p.x, p.y, t));
      const want = isSolid(course, i) ? (light > 0 ? 1 : 0.5) : 0;
      const level = (levels.current[i] += (want - levels.current[i]) * fade);
      group.children.forEach((child) => {
        if (!(child instanceof THREE.Mesh)) return; // the outline stays as it is
        const material = child.material as THREE.MeshStandardMaterial;
        material.opacity = 0.04 + 0.96 * level;
        material.depthWrite = level > 0.9;
        material.emissiveIntensity = (down ? 0.6 : 0.15 + light * 0.55) * level;
      });
    });
  });
  const springRef = useKeySprings(
    platforms.length,
    (i) => platforms[i].y - PLATFORM_THICKNESS / 2,
    (i) => (pressed.current.has(platforms[i].midi) ? -0.06 : 0),
  );

  return (
    <group>
      {night ? (
        <>
          <NightSky />
          {/* dark water far below */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[140, 80]} />
            <meshStandardMaterial color="#0b1030" roughness={0.9} />
          </mesh>
          {beams.map((beam, i) => (
            <Searchlight key={i} beam={beam} course={course} pool={poolTexture} />
          ))}
        </>
      ) : (
        <>
          {/* the cloud sea you fall back into */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[140, 80]} />
            <meshStandardMaterial color="#dbe7f6" roughness={1} />
          </mesh>
          <Clouds clouds={clouds} />
        </>
      )}

      {platforms.map((p, i) => {
        // on the night course, steps that come and go fade with the light
        const fading = night && !alwaysLit(p);
        const lantern = night && !fading;
        const caseColor = p.kind === "goal" ? "#7a5418" : night ? "#151933" : "#2f2b27";
        return (
          <group
            key={i}
            ref={(el) => {
              platformGroups.current[i] = el;
            }}
          >
            {/* dark case under every step, so it reads against the sky like a piano key */}
            <mesh
              geometry={shapes[i].base}
              position={[p.x, p.y - PLATFORM_THICKNESS - CASE_THICKNESS / 2, p.z]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={caseColor} roughness={0.5} transparent={fading} opacity={fading ? 0 : 1} />
            </mesh>
            <mesh
              ref={(el) => {
                springRef(i)(el);
                tops.current[i] = el;
              }}
              geometry={shapes[i].top}
              position={[p.x, p.y - PLATFORM_THICKNESS / 2, p.z]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                color={p.behavior ? BEHAVIOR_COLORS[p.behavior] : COLORS[p.kind]}
                emissive={restGlow[i].colour}
                emissiveIntensity={restGlow[i].intensity}
                roughness={0.45}
                metalness={p.kind === "goal" ? 0.3 : 0}
                transparent={fading}
                opacity={fading ? 0 : 1}
              />
            </mesh>
            {fading ? (
              // a faint outline in the dark, so you can learn the route before the light comes
              <lineSegments geometry={outlines[i]} position={[p.x, p.y - PLATFORM_THICKNESS / 2, p.z]}>
                <lineBasicMaterial color="#8fa0ff" transparent opacity={0.3} />
              </lineSegments>
            ) : null}
            {lantern && p.kind === "rest" ? <Lantern x={p.x - p.width / 2 + 0.2} y={p.y} z={p.z - p.depth / 2 + 0.2} /> : null}
          </group>
        );
      })}
      <Treasure {...goalSpots(course).treasure} star={night} crown={!rewardOwned} />
    </group>
  );
});
