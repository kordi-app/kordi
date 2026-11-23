import * as THREE from "three";
import type { Sky } from "../engine/day-night";

const UP = new THREE.Vector3(0, 1, 0);

/** Scratch vectors for aiming the shadow-casting light (one per scene). */
export const createSunAim = () => ({
  dir: new THREE.Vector3(0.4, 0.8, 0.45).normalize(),
  right: new THREE.Vector3(),
  up: new THREE.Vector3(),
  target: new THREE.Vector3(),
});
export type SunAim = ReturnType<typeof createSunAim>;

/**
 * Point the directional light along `aim.dir`, its shadow map centred on
 * `focus` — snapped to whole shadow texels across the light's view, so shadow
 * edges stay put instead of shimmering as the focus moves.
 */
export function aimSunLight(
  light: THREE.DirectionalLight,
  aim: SunAim,
  focus: THREE.Vector3Like,
  shadow: { extent: number; mapSize: number; distance: number },
) {
  const texel = (shadow.extent * 2) / shadow.mapSize;
  aim.right.crossVectors(UP, aim.dir).normalize();
  aim.up.crossVectors(aim.dir, aim.right).normalize();
  const r = Math.round(aim.right.dot(focus) / texel) * texel;
  const u = Math.round(aim.up.dot(focus) / texel) * texel;
  const d = aim.dir.dot(focus);
  aim.target.copy(aim.right).multiplyScalar(r).addScaledVector(aim.up, u).addScaledVector(aim.dir, d);
  light.target.position.copy(aim.target);
  light.position.copy(aim.target).addScaledVector(aim.dir, shadow.distance);
  light.target.updateMatrixWorld();
}

/** Recolour the sky, fog and lights for the time of day. */
export function applySky(
  scene: THREE.Scene,
  sun: THREE.DirectionalLight | null,
  ambient: THREE.HemisphereLight | null,
  sky: Sky,
) {
  if (scene.background instanceof THREE.Color) scene.background.set(sky.background);
  scene.fog?.color.set(sky.background);
  if (sun) {
    sun.color.set(sky.sunColor);
    sun.intensity = sky.sunIntensity;
  }
  if (ambient) {
    ambient.color.set(sky.hemiSky);
    ambient.groundColor.set(sky.hemiGround);
    ambient.intensity = sky.ambient;
  }
}
