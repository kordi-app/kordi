"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SEA, STREAM_LEVEL } from "../../engine/water";

/**
 * A soft mirror for the water, on capable devices only: the scene drawn once
 * more from under the surface into a small target, which the water's shader
 * samples blurred and wobbled by its ripples (see water.tsx, REFLECT). The
 * weaker tiers never mount this, so they never draw the scene twice.
 *
 * One mirror plane serves all three waters: the stream's and the pool's
 * height. The sea lies 0.3 lower, so what stands in it is mirrored a little
 * askew — lost in the blur.
 */

/** The target is this fraction of the canvas (in CSS pixels): low on purpose, the blur is the look */
const SCALE = 0.4;
const MIRROR_Y = STREAM_LEVEL;

/** What the water's materials read (shared uniform objects: every water sees the same mirror) */
export const reflectionUniforms = {
  uRefl: { value: null as THREE.Texture | null },
  uReflMatrix: { value: new THREE.Matrix4() },
  uReflTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
  uReflOn: { value: 0 },
};

/** The water surfaces themselves: hidden while the mirror is drawn (a mirror doesn't reflect itself) */
const surfaces: THREE.Object3D[] = [];
export function registerSurface(surface: THREE.Object3D | null) {
  if (!surface) return;
  surfaces.push(surface);
  return () => {
    const i = surfaces.indexOf(surface);
    if (i >= 0) surfaces.splice(i, 1);
  };
}

// scratch, reused every frame
const mirror = new THREE.PerspectiveCamera();
const eye = new THREE.Vector3();
const ahead = new THREE.Vector3();
const up = new THREE.Vector3();
const plane = new THREE.Plane();
const clip = new THREE.Vector4();
const q = new THREE.Vector4();
const clearColour = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);
/**
 * What the picture leaves out: everything under the lowest water, not under
 * the mirror — else a rock in the sea would be cut off above its waterline
 * and its reflection would float clear of it.
 */
const ON_PLANE = new THREE.Vector3(0, SEA.level - 0.02, 0);
const wasVisible: boolean[] = [];

function drawMirror(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, target: THREE.WebGLRenderTarget) {
  // the camera, mirrored in the water
  camera.getWorldPosition(eye);
  camera.getWorldDirection(ahead).add(eye);
  up.set(0, 1, 0).transformDirection(camera.matrixWorld);
  mirror.position.set(eye.x, 2 * MIRROR_Y - eye.y, eye.z);
  mirror.up.set(up.x, -up.y, up.z);
  mirror.lookAt(ahead.x, 2 * MIRROR_Y - ahead.y, ahead.z);
  mirror.updateMatrixWorld();
  mirror.projectionMatrix.copy(camera.projectionMatrix);
  mirror.projectionMatrixInverse.copy(camera.projectionMatrixInverse);

  // world position → where to look in the mirror's picture
  reflectionUniforms.uReflMatrix.value
    .set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
    .multiply(mirror.projectionMatrix)
    .multiply(mirror.matrixWorldInverse);

  // nothing under the water belongs in the picture: slant the near plane onto it
  // (Lengyel's oblique clipping, as three's Reflector does it)
  plane.setFromNormalAndCoplanarPoint(UP, ON_PLANE).applyMatrix4(mirror.matrixWorldInverse);
  clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
  const p = mirror.projectionMatrix.elements;
  q.set((Math.sign(clip.x) + p[8]) / p[0], (Math.sign(clip.y) + p[9]) / p[5], -1, (1 + p[10]) / p[14]);
  clip.multiplyScalar(2 / clip.dot(q));
  p[2] = clip.x;
  p[6] = clip.y;
  p[10] = clip.z + 1 - 0.003;
  p[14] = clip.w;

  for (let i = 0; i < surfaces.length; i++) {
    wasVisible[i] = surfaces[i].visible;
    surfaces[i].visible = false;
  }
  const background = scene.background;
  const shadows = gl.shadowMap.autoUpdate;
  const previous = gl.getRenderTarget();
  const alpha = gl.getClearAlpha();
  gl.getClearColor(clearColour);
  // an empty sky stays transparent, so the water keeps its own sky colour there
  scene.background = null;
  gl.setClearColor(0x000000, 0);
  gl.shadowMap.autoUpdate = false; // the shadows of this frame's real pass will do
  gl.setRenderTarget(target);
  gl.clear();
  gl.render(scene, mirror);
  gl.setRenderTarget(previous);
  gl.shadowMap.autoUpdate = shadows;
  gl.setClearColor(clearColour, alpha);
  scene.background = background;
  for (let i = 0; i < surfaces.length; i++) surfaces[i].visible = wasVisible[i];
}

export function WaterReflection() {
  const target = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(256, 160, { depthBuffer: true, stencilBuffer: false });
    t.texture.minFilter = t.texture.magFilter = THREE.LinearFilter;
    t.texture.generateMipmaps = false;
    /**
     * Drawn as the screen is (tone-mapped, sRGB): three compiles a second
     * variant of every material for an ordinary linear target, which would
     * double the island's programs. Marking the target the way an XR layer's
     * is keeps the screen's variants; the water blends the picture in after
     * its own tone mapping, so the two meet in the same space.
     */
    t.texture.colorSpace = THREE.SRGBColorSpace;
    (t as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
    return t;
  }, []);

  useEffect(() => {
    reflectionUniforms.uRefl.value = target.texture;
    reflectionUniforms.uReflOn.value = 1;
    return () => {
      reflectionUniforms.uRefl.value = null;
      reflectionUniforms.uReflOn.value = 0;
      target.dispose();
    };
  }, [target]);

  // Before the frame is drawn. (This runs ahead of the world's own frame, so the
  // mirror is one frame behind the camera: its picture and its matrix agree with
  // each other, which is what the water needs.)
  useFrame(({ gl, scene, camera, size }) => {
    const width = Math.max(64, Math.round(size.width * SCALE));
    const height = Math.max(64, Math.round(size.height * SCALE));
    if (target.width !== width || target.height !== height) {
      target.setSize(width, height);
      reflectionUniforms.uReflTexel.value.set(1 / width, 1 / height);
    }
    drawMirror(gl, scene, camera, target);
  });

  return null;
}
