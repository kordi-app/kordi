"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { skyAt } from "../../model/day-night";
import { LAMPS, hash } from "../../model/island";

export function NightLights() {
  const posts = useRef<THREE.InstancedMesh>(null);
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const bulbMaterial = useRef<THREE.MeshStandardMaterial>(null);
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    LAMPS.forEach((lamp, i) => {
      posts.current?.setMatrixAt(i, matrix.makeTranslation(lamp.x, 1.3, lamp.z));
      bulbs.current?.setMatrixAt(i, matrix.makeTranslation(lamp.x, 2.75, lamp.z));
    });
    if (posts.current) posts.current.instanceMatrix.needsUpdate = true;
    if (bulbs.current) bulbs.current.instanceMatrix.needsUpdate = true;
  }, []);

  const stars = useMemo(() => {
    const COUNT = 600;
    const positions = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // a dome far above and around the island
      const angle = hash(i, 21) * Math.PI * 2;
      const tilt = 0.15 + hash(i, 22) * 1.2;
      positions[i * 3] = Math.cos(angle) * Math.cos(tilt) * 160;
      positions[i * 3 + 1] = 20 + Math.sin(tilt) * 120;
      positions[i * 3 + 2] = Math.sin(angle) * Math.cos(tilt) * 160 - 40;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
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
    if (starMaterial.current) {
      starMaterial.current.opacity = night * 0.9;
      starMaterial.current.visible = night > 0.02;
    }
  });

  return (
    <group>
      <instancedMesh ref={posts} args={[undefined, undefined, LAMPS.length]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 2.6, 8]} />
        <meshStandardMaterial color="#2f2b27" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, LAMPS.length]}>
        <sphereGeometry args={[0.24, 16, 12]} />
        <meshStandardMaterial ref={bulbMaterial} color="#fff4d6" emissive="#ffcf7a" emissiveIntensity={0.1} />
      </instancedMesh>
      <points geometry={stars}>
        <pointsMaterial ref={starMaterial} color="#ffffff" size={0.9} sizeAttenuation transparent opacity={0} fog={false} depthWrite={false} />
      </points>
    </group>
  );
}
