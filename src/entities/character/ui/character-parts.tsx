"use client";

import * as THREE from "three";
import type { AccessoryId, FaceId, HatId } from "../model/types";
import { CrownMesh } from "./crown-mesh";

/**
 * Wearables, placed in the body group's space: the head's top is at y ≈ 1.22,
 * the face sits on the front surface (z ≈ 0.4 around the eyes), the waist
 * around y ≈ 0.55. Shared geometry and materials, like the body's.
 */

const INK = "#221d19";

/**
 * Closed, happy eyes (^ ^): a gentle arc with rounded ends, not a full half
 * circle, so it reads as a smile rather than a bracket.
 */
const HAPPY = { radius: 0.058, tube: 0.019, arc: Math.PI * 0.72 };
/** rolls the arc so it's centred on top (the torus arc starts at +x) */
const HAPPY_ROLL = (Math.PI - HAPPY.arc) / 2;
const HAPPY_ENDS = [HAPPY_ROLL, HAPPY_ROLL + HAPPY.arc].map(
  (angle) => [Math.cos(angle) * HAPPY.radius, Math.sin(angle) * HAPPY.radius, 0] as [number, number, number],
);
/** how far the eyes turn to sit flat on the head's curve (at x ±0.19) */
const EYE_YAW = 0.42;

const GEO = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  cone: new THREE.ConeGeometry(1, 1, 16),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 24),
  ring: new THREE.TorusGeometry(0.11, 0.013, 8, 32),
  band: new THREE.TorusGeometry(0.55, 0.035, 8, 40, Math.PI),
  scarf: new THREE.TorusGeometry(0.5, 0.075, 12, 40),
  happyEye: new THREE.TorusGeometry(HAPPY.radius, HAPPY.tube, 10, 24, HAPPY.arc),
  happyEyeCap: new THREE.SphereGeometry(HAPPY.tube, 10, 8),
  eye: new THREE.SphereGeometry(0.085, 28, 20),
  glint: new THREE.SphereGeometry(0.03, 14, 10),
  glintSmall: new THREE.SphereGeometry(0.013, 10, 8),
};

const mat = (color: string, roughness = 0.5) => new THREE.MeshStandardMaterial({ color, roughness });
const MAT = {
  ink: new THREE.MeshStandardMaterial({ color: INK, roughness: 0.12, metalness: 0.1 }),
  inkMatte: mat(INK, 0.4),
  glint: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
  ribbon: mat("#ff7aa8", 0.45),
  beret: mat("#c8453c", 0.8),
  headphones: mat("#3b3f4a", 0.35),
  cushion: mat("#ff9e6b", 0.6),
  petal: mat("#ffd1e3", 0.6),
  flowerCenter: mat("#ffcf4a", 0.5),
  scarf: mat("#e2574c", 0.85),
  bowtie: mat("#3a5bd9", 0.5),
  gold: new THREE.MeshStandardMaterial({ color: "#f2c14e", metalness: 0.85, roughness: 0.22, emissive: "#7a4a00", emissiveIntensity: 0.3 }),
  amber: new THREE.MeshStandardMaterial({ color: "#ffb347", emissive: "#ff8a1f", emissiveIntensity: 1.1, toneMapped: false }),
};

/** The gold necklace: a fine chain resting on the shoulders, dipping to a sun medallion */
const NECKLACE = {
  chain: new THREE.TorusGeometry(0.515, 0.014, 8, 64),
  bead: new THREE.SphereGeometry(0.022, 10, 8),
  disc: new THREE.CylinderGeometry(0.075, 0.075, 0.022, 28),
  ray: new THREE.ConeGeometry(0.018, 0.05, 6),
  gem: new THREE.SphereGeometry(0.03, 16, 12),
};
/** tipped forward so the front hangs lower than the back */
const NECKLACE_TILT = 0.32;
const NECKLACE_BEADS = Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2);

/** Eyes for each face style (they replace the default dome eyes). */
export function Eyes({ face }: { face: FaceId }) {
  return (
    <>
      {[-0.19, 0.19].map((x) => {
        const side = Math.sign(x);
        switch (face) {
          case "smile":
            // closed, happy ^ ^ — turned to lie on the head's curve so neither end sinks in
            return (
              <group key={x} position={[x, 0.925, 0.412]} rotation={[0, side * EYE_YAW, 0]}>
                <mesh rotation={[0, 0, HAPPY_ROLL]} geometry={GEO.happyEye} material={MAT.inkMatte} />
                {HAPPY_ENDS.map((end, i) => (
                  <mesh key={i} position={end} geometry={GEO.happyEyeCap} material={MAT.inkMatte} />
                ))}
              </group>
            );
          case "sleepy":
            return (
              <mesh key={x} position={[x, 0.94, 0.405]} rotation={[0, 0, side * -0.12]} scale={[0.075, 0.014, 0.012]} geometry={GEO.sphere} material={MAT.inkMatte} />
            );
          default: {
            const sparkle = face === "sparkle";
            return (
              <group key={x} position={[x, 0.95, 0.396]} scale={sparkle ? 1.12 : 1}>
                <mesh scale={[1, 1.08, 0.45]} geometry={GEO.eye} material={MAT.ink} />
                <mesh position={[side * 0.028, 0.034, 0.036]} scale={sparkle ? [1.35, 1.35, 0.4] : [1, 1, 0.4]} geometry={GEO.glint} material={MAT.glint} />
                <mesh position={[-side * 0.026, -0.032, 0.034]} scale={sparkle ? [1.6, 1.6, 0.4] : [1, 1, 0.4]} geometry={GEO.glintSmall} material={MAT.glint} />
                {sparkle ? (
                  <mesh position={[-side * 0.03, 0.02, 0.038]} scale={[0.5, 0.5, 0.3]} geometry={GEO.glintSmall} material={MAT.glint} />
                ) : null}
              </group>
            );
          }
        }
      })}
    </>
  );
}

export function Hat({ hat }: { hat: HatId }) {
  switch (hat) {
    case "crown":
    case "star-crown":
    case "flame-crown":
      return (
        <group position={[0, 1.33, 0]} rotation={[0, 0, 0.12]} scale={0.95}>
          <CrownMesh kind={hat === "crown" ? "gold" : hat === "star-crown" ? "star" : "flame"} />
        </group>
      );
    case "ribbon":
      return (
        <group position={[0.34, 1.28, 0.14]} rotation={[0.25, 0, -0.6]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]} scale={[0.12, 0.22, 0.07]} geometry={GEO.cone} material={MAT.ribbon} />
          ))}
          <mesh scale={0.065} geometry={GEO.sphere} material={MAT.ribbon} />
        </group>
      );
    case "beret":
      return (
        <group position={[0.05, 1.19, -0.02]} rotation={[-0.15, 0, -0.25]}>
          <mesh scale={[0.47, 0.17, 0.45]} geometry={GEO.sphere} material={MAT.beret} />
          <mesh position={[0, 0.17, 0]} scale={[0.025, 0.08, 0.025]} geometry={GEO.cylinder} material={MAT.beret} />
        </group>
      );
    case "headphones":
      return (
        <group position={[0, 0.9, 0]}>
          <mesh geometry={GEO.band} material={MAT.headphones} />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.52, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <mesh scale={[0.13, 0.08, 0.13]} geometry={GEO.cylinder} material={MAT.headphones} />
              <mesh position={[0, -s * 0.045, 0]} scale={[0.1, 0.02, 0.1]} geometry={GEO.cylinder} material={MAT.cushion} />
            </group>
          ))}
        </group>
      );
    case "flower":
      return (
        <group position={[-0.35, 1.2, 0.22]} rotation={[0.6, 0, 0.55]} scale={1.5}>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.075, 0, Math.sin(a) * 0.075]} scale={[0.06, 0.025, 0.06]} geometry={GEO.sphere} material={MAT.petal} />
            );
          })}
          <mesh position={[0, 0.012, 0]} scale={[0.045, 0.03, 0.045]} geometry={GEO.sphere} material={MAT.flowerCenter} />
        </group>
      );
  }
}

export function Accessory({ accessory }: { accessory: AccessoryId }) {
  switch (accessory) {
    case "scarf":
      return (
        <group>
          <mesh position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]} geometry={GEO.scarf} material={MAT.scarf} />
          {/* the loose end hanging at the front */}
          <mesh position={[0.2, 0.36, 0.42]} rotation={[0.15, 0, 0.1]} scale={[0.09, 0.2, 0.04]} geometry={GEO.sphere} material={MAT.scarf} />
        </group>
      );
    case "bowtie":
      return (
        <group position={[0, 0.56, 0.455]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.07, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]} scale={[0.065, 0.12, 0.035]} geometry={GEO.cone} material={MAT.bowtie} />
          ))}
          <mesh scale={0.035} geometry={GEO.sphere} material={MAT.bowtie} />
        </group>
      );
    case "gold-necklace":
      return (
        <group position={[0, 0.64, 0]} rotation={[NECKLACE_TILT, 0, 0]}>
          <group scale={[1, 1, 0.9]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} geometry={NECKLACE.chain} material={MAT.gold} />
            {NECKLACE_BEADS.map((a) => (
              <mesh key={a} position={[Math.cos(a) * 0.515, 0, Math.sin(a) * 0.515]} geometry={NECKLACE.bead} material={MAT.gold} />
            ))}
          </group>
          {/* the medallion hangs straight down from the front of the chain, a little sun */}
          <group position={[0, -0.05, 0.47]} rotation={[-NECKLACE_TILT + Math.PI / 2, 0, 0]}>
            <mesh geometry={NECKLACE.disc} material={MAT.gold} />
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1]} rotation={[0, -a, -Math.PI / 2]} geometry={NECKLACE.ray} material={MAT.gold} />
              );
            })}
            <mesh position={[0, 0.018, 0]} scale={[1, 0.6, 1]} geometry={NECKLACE.gem} material={MAT.amber} />
          </group>
        </group>
      );
    case "glasses":
      return (
        <group position={[0, 0.95, 0.43]}>
          {[-0.19, 0.19].map((x) => (
            <mesh key={x} position={[x, 0, 0]} geometry={GEO.ring} material={MAT.inkMatte} />
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.01, 0.16, 0.01]} geometry={GEO.cylinder} material={MAT.inkMatte} />
        </group>
      );
  }
}
