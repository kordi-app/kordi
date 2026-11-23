"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BRIDGE_DEPTH, XYLO_BARS, XYLO_BAR_WIDTH } from "../../engine/island";
import { GOLD, WOOD, mergeParts, sinceHit, useBuilt } from "./shared";

const BAR_THICKNESS = 0.14;
const BEVEL = 0.035;
/** The two rails each bar rests on, this far either side of the deck's centre line */
const RAIL_Z = BRIDGE_DEPTH / 2 - 0.35;
const FIRST_X = XYLO_BARS[0].x - 0.6;
const LAST_X = XYLO_BARS[XYLO_BARS.length - 1].x + 0.6;
const POST_Z = BRIDGE_DEPTH / 2 + 0.1;
const POST_HEIGHT = 1.2;

/** A bar with softened edges, exactly the old box's footprint (centred, y = thickness). */
function barGeometry() {
  const w = XYLO_BAR_WIDTH / 2 - BEVEL;
  const d = BRIDGE_DEPTH / 2 - BEVEL;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -d);
  shape.lineTo(w, -d);
  shape.lineTo(w, d);
  shape.lineTo(-w, d);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: BAR_THICKNESS - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 2,
  });
  // extruded along +z: stand it up so the thickness runs along y, centred
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, -(BAR_THICKNESS - BEVEL * 2) / 2, 0);
  return geometry;
}

/** Rope handrails sagging between the end posts on each side of the deck. */
function ropeGeometry() {
  const parts = [-1, 1].map((side) => {
    const z = side * POST_Z;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(FIRST_X, POST_HEIGHT - 0.08, z),
      new THREE.Vector3((FIRST_X * 3 + LAST_X) / 4, POST_HEIGHT - 0.26, z),
      new THREE.Vector3((FIRST_X + LAST_X) / 2, POST_HEIGHT - 0.32, z),
      new THREE.Vector3((FIRST_X + LAST_X * 3) / 4, POST_HEIGHT - 0.26, z),
      new THREE.Vector3(LAST_X, POST_HEIGHT - 0.08, z),
    ]);
    return new THREE.TubeGeometry(curve, 32, 0.035, 5, false);
  });
  return mergeParts(parts);
}

/** End posts: a turned post with a collar and a brass ball on top. */
function postGeometry() {
  const profile = [
    [0.13, 0],
    [0.12, 0.08],
    [0.09, 0.12],
    [0.08, 0.9],
    [0.1, 0.95],
    [0.1, 1.02],
    [0.075, 1.06],
    [0.075, POST_HEIGHT - 0.02],
    [0.0, POST_HEIGHT],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, 10);
}

export function XyloBridge() {
  const bar = useBuilt(barGeometry);
  const rope = useBuilt(ropeGeometry);
  const post = useBuilt(postGeometry);
  const bars = useRef<(THREE.Mesh | null)[]>([]);
  const rails = useRef<THREE.InstancedMesh>(null);
  const pads = useRef<THREE.InstancedMesh>(null);
  const posts = useRef<THREE.InstancedMesh>(null);
  const knobs = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    XYLO_BARS.forEach((b, i) => {
      const railHeight = Math.max(0.05, b.top - BAR_THICKNESS);
      [-1, 1].forEach((side, k) => {
        rails.current?.setMatrixAt(i * 2 + k, m.makeScale(XYLO_BAR_WIDTH + 0.12, railHeight, 0.18).setPosition(b.x, railHeight / 2, side * RAIL_Z));
        // a felt pad between rail and bar, so the bar can ring
        pads.current?.setMatrixAt(i * 2 + k, m.makeScale(XYLO_BAR_WIDTH * 0.55, 0.025, 0.22).setPosition(b.x, b.top - BAR_THICKNESS - 0.005, side * RAIL_Z));
      });
    });
    let k = 0;
    for (const x of [FIRST_X, LAST_X]) {
      for (const side of [-1, 1]) {
        posts.current?.setMatrixAt(k, m.makeTranslation(x, 0, side * POST_Z));
        knobs.current?.setMatrixAt(k, m.makeTranslation(x, POST_HEIGHT + 0.06, side * POST_Z));
        k++;
      }
    }
    for (const mesh of [rails.current, pads.current, posts.current, knobs.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, []);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    XYLO_BARS.forEach((b, i) => {
      const mesh = bars.current[i];
      if (!mesh) return;
      const t = sinceHit(`xylo:${i}`, now);
      // struck: dips and rings back up
      const dip = t < 0.6 ? Math.sin(t * 30) * Math.exp(-t * 7) * 0.05 + Math.exp(-t * 9) * -0.05 : 0;
      mesh.position.y = b.top - BAR_THICKNESS / 2 + dip;
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = t < 1 ? 0.6 * Math.exp(-t * 3) : 0;
    });
  });

  return (
    <group>
      {XYLO_BARS.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          geometry={bar}
          position={[b.x, b.top - BAR_THICKNESS / 2, 0]}
          castShadow
          receiveShadow
        >
          {/* lacquered wood: a satin sheen, a touch of clearcoat-like gloss */}
          <meshStandardMaterial color={b.color} emissive={b.color} emissiveIntensity={0} roughness={0.28} metalness={0.04} />
        </mesh>
      ))}
      <instancedMesh ref={rails} args={[undefined, undefined, XYLO_BARS.length * 2]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={WOOD} roughness={0.75} />
      </instancedMesh>
      <instancedMesh ref={pads} args={[undefined, undefined, XYLO_BARS.length * 2]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7a2f3a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={posts} args={[post, undefined, 4]} castShadow>
        <meshStandardMaterial color="#7a5b3d" roughness={0.65} />
      </instancedMesh>
      <instancedMesh ref={knobs} args={[undefined, undefined, 4]}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshStandardMaterial color={GOLD} metalness={0.45} roughness={0.3} />
      </instancedMesh>
      <mesh geometry={rope}>
        <meshStandardMaterial color="#d8c39a" roughness={0.9} />
      </mesh>
    </group>
  );
}
