"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hash } from "../../engine/island";
import { skyAt } from "../../engine/day-night";
import { quality } from "../quality";
import { useBuilt } from "./shared";

/**
 * Where the falls land: mist billowing up off the pool, and droplets thrown
 * out in little arcs. One instanced mesh of camera-facing quads; every
 * particle's whole life is worked out in the vertex shader from its seed and
 * the clock, so a frame costs one uniform and no allocation.
 */
const MIST = { high: 26, low: 16, minimal: 9 }[quality.tier];
const DROPS = { high: 90, low: 50, minimal: 18 }[quality.tier];

const VERTEX = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime;
  uniform float uHalfWidth;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vSoft;
  #include <fog_pars_vertex>
  void main() {
    float mist = step(aSeed.w, 0.5);
    float a = aSeed.x;
    float b = aSeed.y;
    float c = aSeed.z;
    vec3 at;
    float size;
    if (mist > 0.5) {
      // a puff: rises and swells off the foot of the falls, thinning as it goes
      float t = fract(uTime * (0.3 + c * 0.2) + b);
      at = vec3((a * 2.0 - 1.0) * (uHalfWidth + 0.3) + sin(uTime * 0.7 + b * 40.0) * 0.25, 0.25 + t * (1.6 + c * 1.4), 0.2 + c * 1.1 + t * 0.7);
      size = 0.9 + t * 1.7 + c * 0.5;
      vAlpha = 0.34 * smoothstep(0.0, 0.18, t) * (1.0 - t);
      vSoft = 0.0;
    } else {
      // a droplet: thrown up and out from the landing line, falling back into the pool
      float life = 0.55 + c * 0.5;
      float t = fract(uTime / life + b);
      float s = t * life;
      float out_ = fract(b * 7.31);
      float rise = 2.4 + fract(c * 5.17) * 2.6;
      vec3 v = vec3((fract(a * 9.7) - 0.5) * 2.2, rise, 0.5 + out_ * 2.2);
      at = vec3((a * 2.0 - 1.0) * uHalfWidth, 0.1, 0.25 + out_ * 0.3) + v * s - vec3(0.0, rise * s * s / life, 0.0); // back on the water as its life ends
      size = 0.07 + fract(c * 3.3) * 0.08;
      vAlpha = 0.9 * (1.0 - t * t);
      vSoft = 0.25;
    }
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(at, 1.0);
    mvPosition.xy += position.xy * size;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vAlpha;
  varying float vSoft;
  #include <fog_pars_fragment>
  void main() {
    float d = length(vUv - 0.5);
    float alpha = smoothstep(0.5, vSoft, d) * vAlpha;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function sprayGeometry() {
  const quad = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute("position", quad.attributes.position);
  geometry.setAttribute("uv", quad.attributes.uv);
  const count = MIST + DROPS;
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seeds[i * 4] = hash(i, 501);
    seeds[i * 4 + 1] = hash(i, 502);
    seeds[i * 4 + 2] = hash(i, 503);
    seeds[i * 4 + 3] = i < MIST ? 0 : 1;
  }
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = count;
  return geometry;
}

const DAY = new THREE.Color("#f2f9ff");
const NIGHT = new THREE.Color("#8ea2c6");

/** Place at the foot of the falls: x at their middle, z on the falling sheet, facing +z (out over the pool). */
export function FallsSpray({ position, halfWidth }: { position: [number, number, number]; halfWidth: number }) {
  const geometry = useBuilt(sprayGeometry);
  const material = useBuilt(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          { uTime: { value: 0 }, uHalfWidth: { value: halfWidth }, uColor: { value: new THREE.Color(DAY) } },
        ]),
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        fog: true,
        transparent: true,
        depthWrite: false,
      }),
  );
  const mesh = useRef<THREE.Mesh>(null);
  const last = useRef(-Infinity);
  useFrame(({ clock }) => {
    const m = mesh.current?.material as THREE.ShaderMaterial | undefined;
    if (!m) return;
    const now = clock.getElapsedTime();
    m.uniforms.uTime.value = now;
    if (now - last.current < 0.25) return;
    last.current = now;
    m.uniforms.uColor.value.copy(DAY).lerp(NIGHT, skyAt(Date.now()).night);
  });
  // the particles live in the shader, so the quad's own bounds say nothing: never culled (its Zone hides it far away)
  return <mesh ref={mesh} geometry={geometry} material={material} position={position} frustumCulled={false} renderOrder={2} />;
}
