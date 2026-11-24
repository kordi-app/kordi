"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FIRE_REACH, courseRuntime, fireX, type CourseDef } from "../engine/course";

/**
 * The storm temple's world: a ruined temple adrift in an endless storm at
 * dusk. Everything here is backdrop except the dragon's attack, which draws
 * exactly what the engine burns with (engine/course.ts: tickDragon, fireX,
 * burning) — the red band is where the fire will be, the wall is where it is.
 */

/** Deterministic noise so ruins and bolts stay put between renders. */
function hash(i: number, salt: number) {
  const x = Math.sin(i * 57.3 + salt * 19.1) * 43758.5453;
  return x - Math.floor(x);
}

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAGMENT = /* glsl */ `
  varying vec3 vDir;
  uniform float uFlash;
  void main() {
    float h = vDir.y;
    vec3 abyss = vec3(0.10, 0.05, 0.07);
    vec3 ember = vec3(0.86, 0.42, 0.20);
    vec3 dusk = vec3(0.55, 0.27, 0.30);
    vec3 high = vec3(0.17, 0.10, 0.22);
    vec3 c = h < 0.0 ? mix(ember, abyss, smoothstep(0.0, -0.35, h))
                     : mix(mix(ember, dusk, smoothstep(0.0, 0.18, h)), high, smoothstep(0.18, 0.7, h));
    c += vec3(0.55, 0.5, 0.65) * uFlash;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** The dusk sky dome: an ember horizon under a bruised, storm-dark sky; lightning lifts it all. */
function StormSky({ flashRef }: { flashRef: { current: number } }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        uniforms: { uFlash: { value: 0 } },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ camera }) => {
    const dome = mesh.current;
    if (!dome) return;
    // centred on the camera and inside its far plane (150), so no part of it is ever clipped away
    dome.position.copy(camera.position);
    (dome.material as THREE.ShaderMaterial).uniforms.uFlash.value = flashRef.current * 0.35;
  });
  return (
    <mesh ref={mesh} material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[120, 32, 16]} />
    </mesh>
  );
}

/** The eye of the storm: a slow ring of dark cloud high behind the temple, with a burning core. */
function Vortex() {
  const ring = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const angle = (i / 26) * Math.PI * 2;
        const radius = 16 + hash(i, 1) * 6;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.45, scale: 3 + hash(i, 2) * 3 };
      }),
    [],
  );
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.04;
  });
  return (
    <group position={[0, 34, -60]}>
      <mesh>
        <sphereGeometry args={[5, 20, 12]} />
        <meshBasicMaterial color="#ffb070" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
      </mesh>
      <group ref={ring}>
        {puffs.map((p, i) => (
          <mesh key={i} position={[p.x, p.y, 0]} scale={[p.scale * 1.6, p.scale, p.scale]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#3a2630" roughness={1} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const STONE = new THREE.MeshStandardMaterial({ color: "#8c7a6a", roughness: 0.95 });
const STONE_DARK = new THREE.MeshStandardMaterial({ color: "#5e4f45", roughness: 1 });

/** Pieces of the temple adrift around the climb: broken columns, arches and slabs, bobbing slowly. */
function FloatingRuins() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        return {
          kind: i % 3,
          x: side * (16 + hash(i, 1) * 26),
          y: 2 + hash(i, 2) * 34,
          z: -10 - hash(i, 3) * 34,
          tilt: (hash(i, 4) - 0.5) * 0.9,
          spin: (hash(i, 5) - 0.5) * 0.12,
          scale: 0.8 + hash(i, 6) * 1.6,
          bob: hash(i, 7) * Math.PI * 2,
        };
      }),
    [],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((g, i) => {
      if (!g) return;
      const p = pieces[i];
      g.position.y = p.y + Math.sin(t * 0.4 + p.bob) * 0.6;
      g.rotation.y = p.bob + t * p.spin;
    });
  });
  return (
    <>
      {pieces.map((p, i) => (
        <group
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          position={[p.x, p.y, p.z]}
          rotation={[0, 0, p.tilt]}
          scale={p.scale}
        >
          {p.kind === 0 ? (
            // a broken column: drum, shaft snapped off at an angle, capital lost
            <>
              <mesh material={STONE} position={[0, 0, 0]}>
                <cylinderGeometry args={[0.55, 0.6, 3.2, 10]} />
              </mesh>
              <mesh material={STONE_DARK} position={[0, -1.75, 0]}>
                <boxGeometry args={[1.5, 0.35, 1.5]} />
              </mesh>
            </>
          ) : p.kind === 1 ? (
            // an arch: two piers and a lintel
            <>
              <mesh material={STONE} position={[-1.2, 0, 0]}>
                <boxGeometry args={[0.6, 3, 0.7]} />
              </mesh>
              <mesh material={STONE} position={[1.2, 0, 0]}>
                <boxGeometry args={[0.6, 3, 0.7]} />
              </mesh>
              <mesh material={STONE_DARK} position={[0, 1.7, 0]}>
                <boxGeometry args={[3.2, 0.5, 0.8]} />
              </mesh>
            </>
          ) : (
            // a slab of floor, torn away with its steps
            <>
              <mesh material={STONE_DARK}>
                <boxGeometry args={[3, 0.5, 2.2]} />
              </mesh>
              <mesh material={STONE} position={[0.4, 0.4, 0]}>
                <boxGeometry args={[1.6, 0.3, 1.6]} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </>
  );
}

/** A jagged bolt from the clouds, as line points (a few shapes, chosen at random). */
function boltPoints(seed: number) {
  const points: THREE.Vector3[] = [];
  let x = 0;
  for (let i = 0; i <= 12; i++) {
    x += (hash(seed * 13 + i, 9) - 0.5) * 2.4;
    points.push(new THREE.Vector3(x, 30 - i * 3, 0));
  }
  return points;
}

/** Lightning: every few seconds a bolt cracks somewhere behind the temple and the sky flares. */
function Lightning({ flashRef }: { flashRef: { current: number } }) {
  const bolts = useMemo(
    () => [0, 1, 2].map((seed) => new THREE.BufferGeometry().setFromPoints(boltPoints(seed))),
    [],
  );
  useEffect(() => () => bolts.forEach((b) => b.dispose()), [bolts]);
  const line = useRef<THREE.Line>(null);
  const boltLine = useMemo(
    () => new THREE.Line(bolts[0], new THREE.LineBasicMaterial({ color: "#fff4e0", toneMapped: false })),
    [bolts],
  );
  useEffect(() => () => (boltLine.material as THREE.Material).dispose(), [boltLine]);
  const light = useRef<THREE.DirectionalLight>(null);
  const state = useRef({ next: 3, until: 0 });
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const s = state.current;
    if (t > s.next) {
      // frame-time randomness, not render: where and when the next one strikes
      s.until = t + 0.18;
      s.next = t + 4 + Math.random() * 6;
      if (line.current) {
        line.current.geometry = bolts[Math.floor(Math.random() * bolts.length)];
        line.current.position.set((Math.random() - 0.5) * 70, 4, -30 - Math.random() * 20);
      }
    }
    const on = t < s.until;
    // a double flicker, the way lightning really flashes
    flashRef.current = on ? (Math.sin((s.until - t) * 70) > -0.3 ? 1 : 0.3) : Math.max(0, flashRef.current - 0.08);
    if (line.current) line.current.visible = on;
    if (light.current) light.current.intensity = flashRef.current * 2.5;
  });
  return (
    <>
      <primitive object={boltLine} ref={line} visible={false} />
      <directionalLight ref={light} position={[0, 30, -20]} color="#e8e0ff" intensity={0} />
    </>
  );
}

const DRAGON_HIDE = new THREE.MeshStandardMaterial({ color: "#2a1f22", roughness: 0.7, metalness: 0.1 });
const DRAGON_WING = new THREE.MeshStandardMaterial({ color: "#3b2a2e", roughness: 0.9, side: THREE.DoubleSide });
const DRAGON_EYE = new THREE.MeshBasicMaterial({ color: "#ffb347", toneMapped: false });

/** One wing as a membrane between long finger bones: a fan shape, root at the origin, reaching +x. */
const WING_SHAPE = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(1.2, 0.9);
  shape.lineTo(3.6, 1.1);
  shape.lineTo(3.1, 0.2);
  shape.lineTo(3.8, -0.4);
  shape.lineTo(2.4, -0.5);
  shape.lineTo(2.6, -1.2);
  shape.lineTo(1.1, -0.8);
  shape.lineTo(0, -0.4);
  return shape;
})();

/**
 * The temple's dragon — a long, lean drake with ragged wings. It circles far
 * out in the storm; when it attacks it comes in level with the band it's
 * about to burn, facing across the climb.
 */
function Dragon() {
  const body = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([]);
  const wingGeometry = useMemo(() => new THREE.ShapeGeometry(WING_SHAPE), []);
  useEffect(() => () => wingGeometry.dispose(), [wingGeometry]);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, rawDt) => {
    const g = body.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    const dt = Math.min(rawDt, 0.05);
    const breath = courseRuntime.breath;
    let heading: number;
    if (breath) {
      // in behind the climb, just upwind of where the fire starts, level with the band — in view
      target.set(breath.x - breath.dir * (FIRE_REACH + 1), breath.y + 1.6, -7);
      heading = breath.dir > 0 ? 0 : Math.PI;
    } else {
      // a slow circle out in the storm
      const a = t * 0.12;
      target.set(Math.cos(a) * 34, 16 + Math.sin(t * 0.3) * 4, -34 + Math.sin(a) * 12);
      heading = -a - Math.PI / 2;
    }
    g.position.lerp(target, 1 - Math.exp(-dt * (breath ? 2.2 : 0.8)));
    const turn = ((heading - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    g.rotation.y += turn * (1 - Math.exp(-dt * 3));
    // wingbeats: slow and heavy, faster while it hangs in the air to breathe
    const beat = Math.sin(t * (breath ? 5 : 2.6));
    wings.current.forEach((w, i) => {
      if (w) w.rotation.x = (i === 0 ? 1 : -1) * (0.25 + beat * 0.55);
    });
  });

  return (
    <group ref={body} position={[30, 18, -40]} scale={1.3}>
      {/* the body runs along +x: tail at −x, head at +x */}
      <mesh material={DRAGON_HIDE} scale={[1.6, 0.55, 0.6]}>
        <sphereGeometry args={[1, 14, 10]} />
      </mesh>
      <mesh material={DRAGON_HIDE} position={[1.9, 0.35, 0]} rotation={[0, 0, -1.1]}>
        <coneGeometry args={[0.3, 1.6, 8]} />
      </mesh>
      {/* head and jaw, with two swept horns */}
      <group position={[2.7, 0.7, 0]}>
        <mesh material={DRAGON_HIDE} rotation={[0, 0, -Math.PI / 2]} scale={[1, 1, 0.8]}>
          <coneGeometry args={[0.32, 1.1, 8]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={DRAGON_HIDE} position={[-0.3, 0.25, s * 0.18]} rotation={[s * 0.3, 0, 0.9]}>
            <coneGeometry args={[0.06, 0.7, 6]} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`eye${s}`} material={DRAGON_EYE} position={[0.05, 0.1, s * 0.2]}>
            <sphereGeometry args={[0.06, 8, 6]} />
          </mesh>
        ))}
      </group>
      <mesh material={DRAGON_HIDE} position={[-2.3, -0.1, 0]} rotation={[0, 0, Math.PI / 2 + 0.15]}>
        <coneGeometry args={[0.32, 2.6, 8]} />
      </mesh>
      {/* wings from the shoulders, folding up and down about the spine */}
      {[1, -1].map((side, i) => (
        <group
          key={side}
          ref={(el) => {
            wings.current[i] = el;
          }}
          position={[0.4, 0.35, side * 0.4]}
        >
          <mesh geometry={wingGeometry} material={DRAGON_WING} rotation={[side * Math.PI / 2, 0, 0]} scale={[1, side, 1]} />
        </group>
      ))}
    </group>
  );
}

/**
 * The attack: a red band where the fire will sweep, then the wall of fire
 * crossing it. Drawn from the same runtime the hit test reads, so the flames
 * you see are the flames that burn.
 *
 * Read at a glance: the band stays up until the wall has passed (no quiet gap
 * between the warning and the hit), and a bright cap marks the end the fire
 * comes from, so you know which way to watch and when to jump.
 */
function FireBreath({ course }: { course: CourseDef }) {
  const band = useRef<THREE.Group>(null);
  const haze = useRef<THREE.MeshBasicMaterial>(null);
  const edges = useRef<THREE.MeshBasicMaterial[]>([]);
  const cap = useRef<THREE.Mesh>(null);
  const capMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const wall = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const dragon = course.dragon;

  useFrame(({ clock }) => {
    if (!dragon) return;
    const breath = courseRuntime.breath;
    const t = courseRuntime.time;
    const x = fireX(course, t);
    const fireAt = breath ? breath.at + dragon.warn : 0;
    const warning = breath !== null && t < fireAt;
    const active = breath !== null && t < fireAt + dragon.sweep;

    if (band.current) {
      band.current.visible = active;
      if (breath) band.current.position.set(breath.x, breath.y, -1.3);
    }
    // pulsing faster as the fire nears; once it's out, a steady, fainter line until it has passed
    const left = Math.max(0, fireAt - t);
    const pulse = warning ? 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * (10 + 20 * (1 - left / dragon.warn))) : 0;
    // faint inside, so the steps (and the bell stones' own warning glow) stay readable
    if (haze.current) haze.current.opacity = warning ? 0.08 + 0.12 * pulse : 0.05;
    for (const edge of edges.current) edge.opacity = warning ? 0.6 + 0.4 * pulse : 0.4;
    if (cap.current && capMaterial.current) {
      cap.current.visible = warning;
      if (breath) cap.current.position.x = -breath.dir * FIRE_REACH;
      capMaterial.current.opacity = 0.55 + 0.45 * pulse;
      cap.current.scale.x = 1 + pulse * 0.6;
    }

    if (wall.current) {
      wall.current.visible = x !== null;
      if (x !== null && breath) {
        wall.current.position.set(x, breath.y, -1.3);
        // flames lick: a quick, uneven flicker
        const flicker = 1 + Math.sin(clock.getElapsedTime() * 41) * 0.08 + Math.sin(clock.getElapsedTime() * 23) * 0.06;
        wall.current.scale.set(flicker, 1 / flicker, 1);
      }
    }
    if (glow.current) glow.current.intensity = x !== null ? 40 : 0;
  });

  if (!dragon) return null;
  return (
    <>
      <group ref={band} visible={false}>
        {/* a faint red haze over the band, with bright edges top and bottom */}
        <mesh>
          <boxGeometry args={[FIRE_REACH * 2, dragon.band * 2, 6]} />
          <meshBasicMaterial ref={haze} color="#ff2a10" transparent opacity={0.1} depthWrite={false} toneMapped={false} />
        </mesh>
        {[-1, 1].map((s, i) => (
          <mesh key={s} position={[0, s * dragon.band, 3]}>
            <boxGeometry args={[FIRE_REACH * 2, 0.06, 0.06]} />
            <meshBasicMaterial
              ref={(m) => {
                if (m) edges.current[i] = m;
              }}
              color="#ff5a2a"
              transparent
              opacity={0.8}
              toneMapped={false}
            />
          </mesh>
        ))}
        {/* the end the fire comes from: the wall appears here */}
        <mesh ref={cap} visible={false}>
          <boxGeometry args={[0.35, dragon.band * 2.2, 6.2]} />
          <meshBasicMaterial ref={capMaterial} color="#ffb04a" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      <group ref={wall} visible={false}>
        {/* a hot core inside a wider, softer sheet of flame */}
        <mesh>
          <boxGeometry args={[dragon.wall * 1.1, dragon.band * 2, 6]} />
          <meshBasicMaterial color="#ffd27a" transparent opacity={0.75} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh>
          <boxGeometry args={[dragon.wall * 2.2, dragon.band * 2.4, 6.6]} />
          <meshBasicMaterial color="#ff5a1f" transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <pointLight ref={glow} color="#ff7a2a" intensity={0} distance={14} decay={2} />
      </group>
    </>
  );
}

/** Everything around the storm temple's climb. */
export function StormTemple({ course }: { course: CourseDef }) {
  // lightning brightens the sky shader and a flash light together
  const flashRef = useRef(0);
  return (
    <>
      <StormSky flashRef={flashRef} />
      <Vortex />
      <FloatingRuins />
      <Lightning flashRef={flashRef} />
      {/* the temple floor you fall back to: broad enough that its far edge is lost in the ember haze */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[400, 48]} />
        <meshStandardMaterial color="#3a2722" roughness={1} emissive="#3a1408" emissiveIntensity={0.3} />
      </mesh>
      <Dragon />
      <FireBreath course={course} />
    </>
  );
}
