"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { skyAt } from "../../model/day-night";
import { LAMPS, hash } from "../../model/island";
import { mergeParts, useBuilt } from "./shared";

const lathe = (points: number[][], segments: number) => new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/**
 * The cast-iron lamp, everything but the glass as one geometry (still one
 * instanced draw call): a stepped foot, a slender shaft with a collar, a
 * four-bar lantern cage and a little roof with a finial.
 */
function lampIronGeometry() {
  const parts: THREE.BufferGeometry[] = [
    lathe(
      [
        [0.2, 0],
        [0.2, 0.08],
        [0.15, 0.12],
        [0.13, 0.26],
        [0.09, 0.32],
        [0, 0.32],
      ],
      8,
    ),
    new THREE.CylinderGeometry(0.055, 0.075, 2.2, 8).translate(0, 1.4, 0),
    new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8).translate(0, 1.9, 0),
    lathe(
      [
        [0.07, 2.42],
        [0.16, 2.5],
        [0.2, 2.52],
        [0.2, 2.56],
        [0, 2.56],
      ],
      8,
    ),
    // the roof: a flared cap and a finial ball
    lathe(
      [
        [0.29, 3.0],
        [0.27, 3.04],
        [0.12, 3.2],
        [0.04, 3.26],
        [0.0, 3.26],
      ],
      8,
    ),
    new THREE.SphereGeometry(0.05, 8, 6).translate(0, 3.3, 0),
  ];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push(new THREE.BoxGeometry(0.03, 0.46, 0.03).translate(Math.cos(a) * 0.2, 2.78, Math.sin(a) * 0.2));
  }
  return mergeParts(parts);
}

/** The lantern glass inside the cage (this part glows at night). */
const lampGlassGeometry = () =>
  lathe(
    [
      [0.1, 2.56],
      [0.18, 2.66],
      [0.185, 2.88],
      [0.13, 3.0],
      [0, 3.0],
    ],
    12,
  );

export function NightLights() {
  const posts = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const bulbMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const pools = useRef<THREE.InstancedMesh>(null);
  const poolMaterial = useRef<THREE.MeshBasicMaterial>(null);
  /** the warm circle each lamp throws on the ground at night (a soft radial fade) */
  const poolTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => poolTexture.dispose(), [poolTexture]);
  const poolGeometry = useMemo(() => new THREE.CircleGeometry(3, 32).rotateX(-Math.PI / 2), []);
  useEffect(() => () => poolGeometry.dispose(), [poolGeometry]);
  const iron = useBuilt(lampIronGeometry);
  const glass = useBuilt(lampGlassGeometry);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    LAMPS.forEach((lamp, i) => {
      // a slight turn each, so the cages don't all line up
      matrix.makeRotationY(hash(i, 31) * Math.PI).setPosition(lamp.x, 0, lamp.z);
      posts.current?.setMatrixAt(i, matrix);
      bulbs.current?.setMatrixAt(i, matrix);
      pools.current?.setMatrixAt(i, matrix.makeTranslation(lamp.x, 0.04, lamp.z));
    });
    if (pools.current) pools.current.instanceMatrix.needsUpdate = true;
    for (const mesh of [posts.current, bulbs.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, []);

  const stars = useMemo(() => {
    const COUNT = 600;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const tint = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      // a dome far above and around the island
      const angle = hash(i, 21) * Math.PI * 2;
      const tilt = 0.15 + hash(i, 22) * 1.2;
      positions[i * 3] = Math.cos(angle) * Math.cos(tilt) * 160;
      positions[i * 3 + 1] = 20 + Math.sin(tilt) * 120;
      positions[i * 3 + 2] = Math.sin(angle) * Math.cos(tilt) * 160 - 40;
      // most stars white, some faint, a few warm or blue-white
      const kind = hash(i, 23);
      tint.setHSL(kind < 0.15 ? 0.09 : kind > 0.85 ? 0.6 : 0, kind < 0.15 || kind > 0.85 ? 0.6 : 0, 0.65 + hash(i, 24) * 0.35);
      tint.toArray(colors, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  useEffect(() => () => stars.dispose(), [stars]);
  const starMaterial = useRef<THREE.PointsMaterial>(null);
  const last = useRef(0);

  useFrame(({ clock }) => {
    // the sky changes slowly: a few updates a second is plenty
    if (clock.getElapsedTime() - last.current < 0.25) return;
    last.current = clock.getElapsedTime();
    const { night } = skyAt(Date.now());
    if (bulbMaterial.current) bulbMaterial.current.emissiveIntensity = 0.1 + night * 2.2;
    if (poolMaterial.current) {
      poolMaterial.current.opacity = night * 0.5;
      poolMaterial.current.visible = night > 0.02;
    }
    if (starMaterial.current) {
      starMaterial.current.opacity = night * 0.9;
      starMaterial.current.visible = night > 0.02;
    }
  });

  return (
    <group>
      <instancedMesh ref={posts} args={[iron, undefined, LAMPS.length]} castShadow>
        <meshStandardMaterial color="#2f2b27" roughness={0.5} metalness={0.45} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[glass, undefined, LAMPS.length]}>
        <meshStandardMaterial ref={bulbMaterial} color="#fff4d6" emissive="#ffcf7a" emissiveIntensity={0.1} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[poolGeometry, undefined, LAMPS.length]} renderOrder={1}>
        <meshBasicMaterial
          ref={poolMaterial}
          color="#ffcf7a"
          map={poolTexture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      <points geometry={stars}>
        <pointsMaterial ref={starMaterial} vertexColors size={0.9} sizeAttenuation transparent opacity={0} fog={false} depthWrite={false} />
      </points>
    </group>
  );
}
