"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  DREAM_BOUNDS,
  ISLES,
  JELLIES,
  JELLY_RADIUS,
  LOST_NOTES,
  TEACUP,
  dreamRuntime,
  isle,
  type DreamIsle,
} from "../engine/dream-sea";
import { hash } from "../engine/island";
import { useBuilt } from "./island/shared";

/**
 * The cat's dream: a sea of stars you walk on, islands holding dream things,
 * jellyfish lanterns, two moons lying on the water (one of them the dreaming
 * cat's eye) and the whale, swimming through it all — until you bring it its
 * notes and it comes to the summit to sing. Everything lights itself; the
 * palette is indigo, violet and silver.
 */

const STAR = "#ffe9a8";
const SILVER = "#dfe6ff";
const VIOLET = "#9d8cff";
const DEEP = "#141a46";
const ROCK = "#262b5e";
const LAWN = "#a99cf0";

// ── the sea ──────────────────────────────────────────────────────────────────

/** Stars scattered on (just under) the sea's surface, twinkling */
function SeaStars() {
  const geometry = useBuilt(() => {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(hash(i, 1)) * 90;
      const a = hash(i, 2) * Math.PI * 2;
      positions.set([Math.cos(a) * r, 0.02, Math.sin(a) * r - 10], i * 3);
      phase[i] = hash(i, 3) * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
    return g;
  });
  const material = useBuilt(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { time: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float phase;
          uniform float time;
          varying float vTwinkle;
          void main() {
            vTwinkle = 0.45 + 0.55 * sin(time * 1.7 + phase * 3.0);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (2.0 + 2.5 * vTwinkle) * (60.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vTwinkle;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(1.0, 0.95, 0.8, (1.0 - d * 2.0) * vTwinkle);
          }`,
      }),
  );
  const points = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    const shader = points.current?.material as THREE.ShaderMaterial | undefined;
    if (shader) shader.uniforms.time.value = clock.getElapsedTime();
  });
  return <points ref={points} geometry={geometry} material={material} />;
}

/**
 * Two moons lying on the water ahead: a full one, and a narrow slit-pupilled
 * one — the dreaming cat's eye, half-open, watching.
 */
function Moons() {
  const eye = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    // a slow blink every so often
    const t = clock.getElapsedTime() % 9;
    if (eye.current) eye.current.scale.y = t > 8.7 ? 0.08 : 1;
  });
  return (
    <group position={[0, 0.03, -78]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[-16, 0, 0]}>
        <circleGeometry args={[7, 48]} />
        <meshBasicMaterial color="#fff6d8" toneMapped={false} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-16, 0, -0.01]}>
        <circleGeometry args={[10, 48]} />
        <meshBasicMaterial color="#fff6d8" toneMapped={false} transparent opacity={0.12} />
      </mesh>
      <group position={[17, 0, 0]}>
        <mesh ref={eye} scale={[1, 1, 1]}>
          <circleGeometry args={[5.5, 48]} />
          <meshBasicMaterial color="#d9f27a" toneMapped={false} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.01]} scale={[0.22, 1, 1]}>
          <circleGeometry args={[4.6, 32]} />
          <meshBasicMaterial color="#10132e" />
        </mesh>
      </group>
    </group>
  );
}

/** Rings that spread on the star sea where you walk */
function Wake({ player }: { player: THREE.Vector3 }) {
  const RINGS = 8;
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const state = useRef({ next: 0, last: new THREE.Vector3(), born: Array.from({ length: RINGS }, () => -Infinity) });
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const s = state.current;
    // a ring every half step while walking on the sea itself
    if (player.y < 0.05 && player.distanceTo(s.last) > 0.9) {
      s.last.copy(player);
      const i = s.next++ % RINGS;
      s.born[i] = t;
      rings.current[i]?.position.set(player.x, 0.04, player.z);
    }
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const age = t - s.born[i];
      ring.visible = age < 1.6;
      ring.scale.setScalar(0.3 + age * 1.6);
      (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 * (1 - age / 1.6));
    });
  });
  return (
    <>
      {Array.from({ length: RINGS }, (_, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          ref={(m) => {
            rings.current[i] = m;
          }}
        >
          <ringGeometry args={[0.85, 1, 40]} />
          <meshBasicMaterial color={SILVER} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

// ── islands and the dream things on them ─────────────────────────────────────

/** An island: a violet lawn on a short rock cone that dips into the sea */
function Isle({ isle: i }: { isle: DreamIsle }) {
  const depth = Math.min(i.top + 0.4, 3.2);
  return (
    <group position={[i.x, i.top, i.z]}>
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <cylinderGeometry args={[i.r, i.r, 0.3, 36]} />
        <meshStandardMaterial color={LAWN} emissive={LAWN} emissiveIntensity={0.18} roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.3 - depth / 2, 0]}>
        <cylinderGeometry args={[i.r, i.r * 0.35, depth, 14]} />
        <meshStandardMaterial color={ROCK} emissive="#1b1f52" emissiveIntensity={0.4} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

/** A giant scallop shell, lid lifted, a pearl's glow inside */
function Shell() {
  const lid = useRef<THREE.Group>(null);
  const i = isle("shell");
  useFrame(({ clock }) => {
    // it breathes open and shut, slowly
    if (lid.current) lid.current.rotation.x = -0.75 - Math.sin(clock.getElapsedTime() * 0.6) * 0.15;
  });
  const ribs = useMemo(() => Array.from({ length: 9 }, (_, k) => ((k - 4) / 4) * 1.2), []);
  const half = (
    <>
      <mesh scale={[1.9, 0.55, 1.5]}>
        <sphereGeometry args={[1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f6dcec" emissive="#f0b8d8" emissiveIntensity={0.25} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      {ribs.map((a) => (
        <mesh key={a} rotation={[0, a, 0]} position={[0, 0.02, 0]} scale={[0.08, 0.56, 1.52]}>
          <sphereGeometry args={[1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e8c4dc" roughness={0.4} />
        </mesh>
      ))}
    </>
  );
  return (
    <group position={[i.x, i.top, i.z - 0.6]}>
      <group rotation={[Math.PI, 0, 0]} position={[0, 0.05, 0]}>
        {half}
      </group>
      <group ref={lid} position={[0, 0.1, -1.4]}>
        <group position={[0, 0, 1.4]}>{half}</group>
      </group>
      <pointLight color="#ffd6ee" intensity={10} distance={6} position={[0, 0.8, 0.6]} />
    </group>
  );
}

/** A teacup on its saucer, tea you can stand on, steam curling up */
function Teacup() {
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    steam.current?.children.forEach((puff, k) => {
      const age = (t * 0.35 + k / 5) % 1;
      puff.position.set(Math.sin(t + k * 1.7) * 0.4 * age, age * 2.6, Math.cos(t * 0.8 + k) * 0.3 * age);
      puff.scale.setScalar(0.25 + age * 0.5);
      ((puff as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.35 * (1 - age);
    });
  });
  const { saucer, cup } = TEACUP;
  const cupHeight = cup.top - saucer.top;
  return (
    <group position={[TEACUP.x, 0, TEACUP.z]}>
      <mesh position={[0, saucer.top - 0.08, 0]}>
        <cylinderGeometry args={[saucer.r, saucer.r * 0.7, 0.16, 40]} />
        <meshStandardMaterial color="#f4f2ff" emissive="#c9c4ff" emissiveIntensity={0.2} roughness={0.25} />
      </mesh>
      <mesh position={[0, saucer.top + cupHeight / 2, 0]}>
        <cylinderGeometry args={[cup.r, cup.r * 0.72, cupHeight, 40, 1, true]} />
        <meshStandardMaterial color="#f4f2ff" emissive="#c9c4ff" emissiveIntensity={0.2} roughness={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, cup.top - 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[cup.r * 0.97, 40]} />
        <meshStandardMaterial color="#b07a4a" emissive="#5a3418" emissiveIntensity={0.35} roughness={0.15} />
      </mesh>
      {/* the handle */}
      <mesh position={[cup.r + 0.25, saucer.top + cupHeight / 2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.32, 0.08, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#f4f2ff" roughness={0.25} />
      </mesh>
      <group ref={steam} position={[0, cup.top, 0]}>
        {Array.from({ length: 5 }, (_, k) => (
          <mesh key={k}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshBasicMaterial color="#e8ecff" transparent opacity={0.3} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** A tree growing upside down: its crown rests on the island, its roots reach up into the dark */
function UpsideDownTree() {
  const i = isle("tree");
  const roots = useMemo(
    () =>
      Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * Math.PI * 2 + 0.4;
        return { a, tilt: 0.55 + hash(k, 9) * 0.3, length: 1.6 + hash(k, 10) * 0.8 };
      }),
    [],
  );
  return (
    <group position={[i.x - 0.9, i.top, i.z]}>
      {/* the crown, a cloud of leaves on the ground */}
      {[
        [0, 0.55, 0, 1.0],
        [0.7, 0.4, 0.3, 0.7],
        [-0.6, 0.45, -0.2, 0.75],
        [0.1, 0.35, -0.7, 0.65],
      ].map(([x, y, z, r], k) => (
        <mesh key={k} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color="#5a7fd8" emissive="#3a54b8" emissiveIntensity={0.35} roughness={0.8} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.14, 0.26, 2.6, 8]} />
        <meshStandardMaterial color="#6b5a8c" roughness={0.9} />
      </mesh>
      {/* roots fanning out at the top */}
      {roots.map(({ a, tilt, length }) => (
        <group key={a} position={[0, 3.4, 0]} rotation={[0, a, tilt]}>
          <mesh position={[0, length / 2, 0]}>
            <cylinderGeometry args={[0.03, 0.09, length, 6]} />
            <meshStandardMaterial color="#6b5a8c" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* the branch the note hangs from */}
      <mesh position={[1.05, 2.6, 0]} rotation={[0, 0, -1.2]}>
        <cylinderGeometry args={[0.03, 0.06, 1.3, 6]} />
        <meshStandardMaterial color="#6b5a8c" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A crescent moon lantern on a post */
function MoonLantern() {
  const i = isle("moon");
  return (
    <group position={[i.x, i.top, i.z]}>
      <mesh position={[-0.9, 1.3, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 2.6, 8]} />
        <meshStandardMaterial color="#8a86b8" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.15, 0]} rotation={[0, 0, 0.5]}>
        <torusGeometry args={[0.85, 0.16, 12, 40, Math.PI * 1.3]} />
        <meshBasicMaterial color="#fff2b8" toneMapped={false} />
      </mesh>
      <pointLight color="#fff2b8" intensity={14} distance={8} position={[0, 1.2, 0]} />
    </group>
  );
}

/** A ring of standing stones round the summit, where the whale comes to sing */
function SummitStones() {
  const i = isle("summit");
  return (
    <group position={[i.x, i.top, i.z]}>
      {Array.from({ length: 7 }, (_, k) => {
        const a = (k / 7) * Math.PI * 2;
        const h = 0.9 + hash(k, 21) * 0.7;
        return (
          <mesh key={k} position={[Math.cos(a) * (i.r - 0.6), h / 2, Math.sin(a) * (i.r - 0.6)]}>
            <boxGeometry args={[0.35, h, 0.35]} />
            <meshStandardMaterial color="#cfd6ff" emissive="#8a96ff" emissiveIntensity={0.3} roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.8, 48]} />
        <meshBasicMaterial color={STAR} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Jellyfish lanterns: a glowing bell with trailing tentacles, bobbing on the dark */
function Jellies() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current?.children.forEach((jelly, k) => {
      const j = JELLIES[k];
      // only a breath of bob: the step you land on is where it looks to be
      jelly.position.y = j.top + Math.sin(t * 1.3 + k) * 0.05;
      jelly.scale.set(1 + Math.sin(t * 2.6 + k) * 0.04, 1, 1 + Math.sin(t * 2.6 + k) * 0.04);
    });
  });
  return (
    <group ref={group}>
      {JELLIES.map((j, k) => (
        <group key={k} position={[j.x, j.top, j.z]}>
          <mesh>
            <sphereGeometry args={[JELLY_RADIUS * 1.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#c8b8ff"
              emissive={k % 2 ? "#ff9ce0" : "#9fd8ff"}
              emissiveIntensity={0.9}
              transparent
              opacity={0.75}
              roughness={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
          {Array.from({ length: 5 }, (_, n) => {
            const a = (n / 5) * Math.PI * 2;
            return (
              <mesh key={n} position={[Math.cos(a) * 0.4, -0.6, Math.sin(a) * 0.4]}>
                <cylinderGeometry args={[0.02, 0.01, 1.1, 4]} />
                <meshBasicMaterial color="#d8ccff" transparent opacity={0.5} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

// ── the lost notes ───────────────────────────────────────────────────────────

/** A glowing eighth note: head, stem and flag */
function NoteGlyph() {
  return (
    <group>
      <mesh rotation={[0, 0, 0.4]} scale={[1.25, 0.9, 0.7]}>
        <sphereGeometry args={[0.16, 14, 10]} />
        <meshBasicMaterial color={STAR} toneMapped={false} />
      </mesh>
      <mesh position={[0.17, 0.32, 0]}>
        <boxGeometry args={[0.045, 0.62, 0.045]} />
        <meshBasicMaterial color={STAR} toneMapped={false} />
      </mesh>
      <mesh position={[0.28, 0.5, 0]} rotation={[0, 0, -0.7]}>
        <boxGeometry args={[0.24, 0.05, 0.045]} />
        <meshBasicMaterial color={STAR} toneMapped={false} />
      </mesh>
    </group>
  );
}

function LostNotes() {
  const notes = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    LOST_NOTES.forEach((note, i) => {
      const g = notes.current[i];
      if (!g) return;
      g.visible = !dreamRuntime.found[i];
      g.position.set(note.x, note.y - 0.3 + Math.sin(t * 1.8 + i) * 0.1, note.z);
      g.rotation.y = t * 1.2 + i;
    });
  });
  return (
    <>
      {LOST_NOTES.map((note, i) => (
        <group
          key={i}
          ref={(g) => {
            notes.current[i] = g;
          }}
        >
          <NoteGlyph />
          <pointLight color={STAR} intensity={4} distance={4} />
        </group>
      ))}
    </>
  );
}

// ── the whale ────────────────────────────────────────────────────────────────

/** Where the whale hovers to sing, beside the summit */
const SING_AT = new THREE.Vector3(isle("summit").x + 7, isle("summit").top + 2.5, isle("summit").z - 4);

/**
 * The whale: swims a wide loop through the sea of stars, rising out of it and
 * diving back in. Once it has its notes it comes to the summit and sings,
 * notes streaming from it.
 */
function Whale() {
  const root = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const song = useRef<THREE.Group>(null);
  const state = useRef({ pos: new THREE.Vector3(30, 2, -10), look: new THREE.Vector3() });
  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = clock.getElapsedTime();
    const s = state.current;
    const singing = dreamRuntime.sungAt > -Infinity;
    const want = singing
      ? SING_AT
      : s.look.set(Math.cos(t * 0.07) * 34, 2.5 + Math.sin(t * 0.21) * 3.5, Math.sin(t * 0.07) * 26 - 12);
    const before = s.pos.clone();
    s.pos.lerp(want, 1 - Math.exp(-dt * (singing ? 0.8 : 3)));
    if (root.current) {
      root.current.position.copy(s.pos);
      const vx = s.pos.x - before.x;
      const vz = s.pos.z - before.z;
      if (!singing && Math.hypot(vx, vz) > 1e-4) root.current.rotation.y = Math.atan2(vx, vz);
      if (singing) root.current.rotation.y += (Math.atan2(-1, -0.5) - root.current.rotation.y) * (1 - Math.exp(-dt * 1.5));
      root.current.rotation.x = Math.sin(t * 0.21) * 0.15;
    }
    if (tail.current) tail.current.rotation.x = Math.sin(t * (singing ? 1.6 : 1.1)) * 0.35;
    if (song.current) {
      song.current.visible = singing;
      song.current.children.forEach((note, k) => {
        const age = (t * 0.4 + k / 6) % 1;
        note.position.set(Math.sin(k * 2.1 + t) * age * 2, 2.6 + age * 5, Math.cos(k * 1.3) * age * 2);
        note.scale.setScalar(1.2 * (1 - age * 0.6));
      });
    }
  });
  return (
    <group ref={root} scale={2.4}>
      <mesh scale={[1.2, 1, 2.6]}>
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial color="#3c4fa8" emissive="#4a63d8" emissiveIntensity={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.32, 0.15]} scale={[0.95, 0.65, 2.3]}>
        <sphereGeometry args={[1, 28, 16]} />
        <meshStandardMaterial color="#e8eeff" emissive="#bcd0ff" emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.78, 0.12, 1.7]} scale={0.09}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#10132e" />
        </mesh>
      ))}
      <mesh position={[0, 0.98, 0.9]} rotation={[-0.3, 0, 0.6]}>
        <torusGeometry args={[0.32, 0.08, 10, 24, Math.PI * 1.25]} />
        <meshBasicMaterial color="#ffe9a0" toneMapped={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.15, -0.4, 0.5]} rotation={[0, 0, side * 0.5]} scale={[0.7, 0.1, 0.4]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#33449a" roughness={0.4} />
        </mesh>
      ))}
      <group ref={tail} position={[0, 0.1, -2.3]}>
        <mesh position={[0, 0, -0.6]} scale={[0.45, 0.38, 0.9]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color="#3c4fa8" emissive="#4a63d8" emissiveIntensity={0.45} roughness={0.35} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.6, 0.05, -1.4]} rotation={[0, side * 0.5, 0]} scale={[0.75, 0.08, 0.38]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#33449a" roughness={0.4} />
          </mesh>
        ))}
      </group>
      <group ref={song} visible={false}>
        {Array.from({ length: 6 }, (_, k) => (
          <group key={k}>
            <NoteGlyph />
          </group>
        ))}
      </group>
      <pointLight color="#9fb8ff" intensity={20} distance={18} />
    </group>
  );
}

export function DreamSea({ player }: { player: THREE.Vector3 }) {
  return (
    <group>
      {/* the sea: dark, faintly lit from within, stretching away into the fog */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, (DREAM_BOUNDS.zMin + DREAM_BOUNDS.zMax) / 2]} receiveShadow>
        <circleGeometry args={[140, 64]} />
        <meshStandardMaterial color={DEEP} emissive="#0d1240" emissiveIntensity={0.6} roughness={0.25} metalness={0.3} />
      </mesh>
      <SeaStars />
      <Moons />
      <Wake player={player} />
      {ISLES.map((i) => (
        <Isle key={i.thing} isle={i} />
      ))}
      <Shell />
      <Teacup />
      <UpsideDownTree />
      <MoonLantern />
      <SummitStones />
      <Jellies />
      <LostNotes />
      <Whale />
      {/* a ring of drifting bubbles round the note out on the open sea */}
      <mesh position={[LOST_NOTES[4].x, 0.03, LOST_NOTES[4].z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.25, 40]} />
        <meshBasicMaterial color={VIOLET} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      <hemisphereLight args={["#8fa6ff", "#1a1f52", 0.6]} />
    </group>
  );
}
