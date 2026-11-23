"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DRUMS } from "../../model/island";
import { GOLD, sinceHit, useBuilt } from "./shared";

/** The skin sits just above the shell's cap so the two never z-fight */
const SKIN_LIFT = 0.015;
/** Tension rods (and the lugs holding them) round each shell */
const RODS = 8;

/**
 * A drum shell of unit radius and height: a gentle barrel bulge, a bevelled
 * foot and a rolled bearing edge under the skin. Scaled per drum (the widest
 * point stays within the drum's collision circle's old 4% overhang).
 */
function shellGeometry() {
  const profile = [
    [1.035, 0],
    [1.04, 0.035],
    [1.005, 0.09],
    [1.022, 0.3],
    [1.03, 0.5],
    [1.022, 0.7],
    [1.005, 0.9],
    [1.02, 0.955],
    [0.985, 1],
    [0, 1],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, 40);
}

/**
 * The drum head, flat on the ground plane, unit radius: vertex colours give it
 * a darker reinforcing dot in the middle and a shaded edge under the hoop.
 */
function skinGeometry() {
  const RINGS = 8;
  const geometry = new THREE.RingGeometry(0, 1, 40, RINGS).rotateX(-Math.PI / 2);
  const shade = [0.86, 0.88, 1, 1, 1, 0.99, 0.97, 0.94, 0.84];
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const r = Math.hypot(position.getX(i), position.getZ(i));
    const s = shade[Math.round(r * RINGS)];
    colors[i * 3] = s;
    colors[i * 3 + 1] = s;
    colors[i * 3 + 2] = s * 0.98;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** Thin hoops: unit radius, flat; scaled to each drum's rim */
const hoopGeometry = () => new THREE.TorusGeometry(1, 0.035, 8, 48).rotateX(Math.PI / 2);

export function DrumValley() {
  const shell = useBuilt(shellGeometry);
  const skin = useBuilt(skinGeometry);
  const hoop = useBuilt(hoopGeometry);
  const skins = useRef<(THREE.Mesh | null)[]>([]);
  const hoops = useRef<THREE.InstancedMesh>(null);
  const rods = useRef<THREE.InstancedMesh>(null);
  const lugs = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    DRUMS.forEach((drum, i) => {
      // a top and a bottom hoop
      [drum.top - 0.04, 0.06].forEach((y, k) => {
        hoops.current?.setMatrixAt(i * 2 + k, m.compose(p.set(drum.x, y, drum.z), q.identity(), s.set(drum.r * 1.025, 1, drum.r * 1.025)));
      });
      const rodLength = drum.top - 0.12;
      for (let k = 0; k < RODS; k++) {
        const a = ((k + 0.5) / RODS) * Math.PI * 2;
        const cx = Math.cos(a);
        const cz = Math.sin(a);
        q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, -a);
        rods.current?.setMatrixAt(
          i * RODS + k,
          m.compose(p.set(drum.x + cx * drum.r * 1.05, drum.top / 2, drum.z + cz * drum.r * 1.05), q, s.set(1, rodLength, 1)),
        );
        // the lug: a little bevelled block on the shell's belly
        const lugHeight = Math.min(0.24, drum.top * 0.32);
        lugs.current?.setMatrixAt(
          i * RODS + k,
          m.compose(p.set(drum.x + cx * drum.r * 1.045, drum.top / 2, drum.z + cz * drum.r * 1.045), q, s.set(0.07, lugHeight, 0.13)),
        );
      }
    });
    for (const mesh of [hoops.current, rods.current, lugs.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, []);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    DRUMS.forEach((drum, i) => {
      const head = skins.current[i];
      if (!head) return;
      const t = sinceHit(`drum:${i}`, now);
      const thump = t < 0.5 ? Math.exp(-t * 10) : 0;
      const r = drum.r * 0.98 * (1 + thump * 0.05);
      head.scale.set(r, 1, r);
      head.position.y = drum.top + SKIN_LIFT - thump * 0.08;
      (head.material as THREE.MeshStandardMaterial).emissiveIntensity = thump * 0.5;
    });
  });

  return (
    <group>
      {DRUMS.map((drum, i) => (
        <group key={i} position={[drum.x, 0, drum.z]}>
          <mesh geometry={shell} scale={[drum.r, drum.top, drum.r]} castShadow receiveShadow>
            <meshStandardMaterial color={drum.color} roughness={0.38} metalness={0.05} />
          </mesh>
          <mesh
            ref={(el) => {
              skins.current[i] = el;
            }}
            geometry={skin}
            position={[0, drum.top + SKIN_LIFT, 0]}
            scale={[drum.r * 0.98, 1, drum.r * 0.98]}
            receiveShadow
          >
            <meshStandardMaterial color="#f7f0e0" vertexColors emissive="#fff4d6" emissiveIntensity={0} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* all the drums' hoops, rods and lugs: three draw calls */}
      <instancedMesh ref={hoops} args={[hoop, undefined, DRUMS.length * 2]} castShadow>
        <meshStandardMaterial color={GOLD} metalness={0.45} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={rods} args={[undefined, undefined, DRUMS.length * RODS]}>
        <cylinderGeometry args={[0.018, 0.018, 1, 5]} />
        <meshStandardMaterial color="#d9d2c2" metalness={0.6} roughness={0.3} />
      </instancedMesh>
      <instancedMesh ref={lugs} args={[undefined, undefined, DRUMS.length * RODS]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#efe6d0" metalness={0.55} roughness={0.28} />
      </instancedMesh>
    </group>
  );
}
