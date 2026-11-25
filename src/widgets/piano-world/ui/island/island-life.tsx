"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { skyAt } from "../../engine/day-night";
import { STREAM, hash } from "../../engine/island";
import { BLOSSOMS, BUSHES, FLOWERS } from "../../engine/nature";
import { quality } from "../quality";

/**
 * The island's small life: butterflies over the flower patches by day, petals
 * drifting down from the blossom trees, fireflies along the stream and round
 * the bushes at night. All of it is one instanced mesh with one shader (one
 * draw call, one program to compile); every creature is a little quad that the
 * vertex shader flies, so nothing here runs per creature on the CPU.
 */

const BUTTERFLY = 0;
const PETAL = 1;
const FIREFLY = 2;

/** How many of each to keep: every n-th candidate (lighter devices draw fewer) */
const STRIDE = quality.tier === "high" ? 1 : quality.tier === "low" ? 2 : 5;

const WINGS = ["#ffb3c7", "#ffd97a", "#ffffff", "#bfa8ff", "#ffb07f", "#9ad8ff"];
const PETAL_PINKS = ["#ffc4d3", "#ffb1c6", "#ffe3ea"];
const FIREFLY_GLOW = "#e6ff8a";

interface Creature {
  kind: number;
  x: number;
  y: number;
  z: number;
  size: number;
  /** how far it roams from home */
  range: number;
  colour: string;
}

function creatures(): Creature[] {
  const out: Creature[] = [];
  // butterflies keep to the flowers: one for every so many blooms, so the thick patches get a few each
  FLOWERS.forEach((flower, i) => {
    if (i % (9 * STRIDE) !== 0) return;
    out.push({
      kind: BUTTERFLY,
      x: flower.x,
      y: 0.9 + hash(i, 201) * 0.9,
      z: flower.z,
      size: 0.26 + hash(i, 202) * 0.12,
      range: 1.2 + hash(i, 203) * 1.6,
      colour: WINGS[Math.floor(hash(i, 204) * WINGS.length)],
    });
  });
  // petals fall from each blossom tree's crown
  BLOSSOMS.forEach((tree, i) => {
    const count = Math.max(1, Math.round(9 / STRIDE));
    for (let k = 0; k < count; k++) {
      const n = i * 16 + k;
      const angle = hash(n, 211) * Math.PI * 2;
      const out_ = hash(n, 212) * 1.5 * tree.scale;
      out.push({
        kind: PETAL,
        x: tree.x + Math.cos(angle) * out_,
        y: (3.2 + hash(n, 213) * 1.4) * tree.scale,
        z: tree.z + Math.sin(angle) * out_,
        size: 0.11 + hash(n, 214) * 0.05,
        range: 1,
        colour: PETAL_PINKS[n % PETAL_PINKS.length],
      });
    }
  });
  // fireflies gather by the bushes and along the stream's banks
  BUSHES.forEach((bush, i) => {
    if (i % STRIDE !== 0) return;
    out.push({ kind: FIREFLY, x: bush.x, y: 0.7 + hash(i, 221) * 1.3, z: bush.z, size: 0.3, range: 1.4 + hash(i, 222), colour: FIREFLY_GLOW });
  });
  for (let k = 0, z = STREAM.zMin + 8; z < STREAM.zMax - 6; k++, z += 2.6 * STRIDE) {
    const side = k % 2 === 0 ? 1 : -1;
    out.push({
      kind: FIREFLY,
      x: STREAM.x + side * (STREAM.width / 2 + hash(k, 223) * 2.5),
      y: 0.5 + hash(k, 224) * 1.2,
      z: z + hash(k, 225) * 2,
      size: 0.3,
      range: 1.6,
      colour: FIREFLY_GLOW,
    });
  }
  return out;
}

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uNight;
  attribute vec3 aHome;
  /** seed 0–1, kind, size, range */
  attribute vec4 aInfo;
  attribute vec3 aTint;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vKind;
  varying float vShow;
  #include <fog_pars_vertex>

  vec3 turnY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(p.x * c + p.z * s, p.y, p.z * c - p.x * s);
  }
  vec3 turnX(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(p.x, p.y * c - p.z * s, p.z * c + p.y * s);
  }

  void main() {
    float seed = aInfo.x;
    float kind = aInfo.y;
    vUv = position.xz;
    vKind = kind;
    vTint = aTint;
    vec3 p = position;
    vec4 mvPosition;
    if (kind < 0.5) {
      // a butterfly wanders a loose loop round its flowers, nose first, wings beating
      float t = uTime * (0.22 + fract(seed * 7.3) * 0.2) + seed * 40.0;
      float a = seed * 9.0;
      float b = seed * 5.0;
      vec2 roam = vec2(sin(t) + 0.5 * sin(t * 2.3 + a), cos(t * 0.8) + 0.5 * cos(t * 1.7 + b));
      vec2 going = vec2(cos(t) + 1.15 * cos(t * 2.3 + a), -0.8 * sin(t * 0.8) - 0.85 * sin(t * 1.7 + b));
      float beat = sin(uTime * (13.0 + fract(seed * 3.1) * 6.0) + seed * 30.0) * 0.95 + 0.3;
      p = vec3(p.x * cos(beat), abs(p.x) * sin(beat), p.z);
      p = turnY(p * aInfo.z, atan(going.x, going.y));
      vec3 centre = aHome + vec3(roam.x * aInfo.w, 0.22 * sin(t * 3.1 + a) + 0.05 * beat, roam.y * aInfo.w);
      mvPosition = viewMatrix * vec4(centre + p, 1.0);
      // lighter on the upstroke, and gone to roost by night
      vTint *= 0.82 + 0.18 * beat;
      vShow = 1.0 - smoothstep(0.25, 0.6, uNight);
    } else if (kind < 1.5) {
      // a petal lets go of the crown, tumbles down on the breeze, and another follows
      float period = 7.0 + fract(seed * 5.7) * 6.0;
      float f = fract(uTime / period + seed);
      p = turnY(turnX(p * aInfo.z, f * 9.0 + seed * 20.0), f * 5.0 + seed * 11.0);
      vec3 centre = vec3(
        aHome.x + f * 1.8 + sin(f * 9.4 + seed * 20.0) * 0.5,
        mix(aHome.y, 0.06, f * f * 0.35 + f * 0.65),
        aHome.z + f * 0.7 + cos(f * 7.1 + seed * 13.0) * 0.4
      );
      mvPosition = viewMatrix * vec4(centre + p, 1.0);
      vShow = smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.94, 1.0, f));
    } else {
      // a firefly drifts and pulses, facing the camera, only after dark
      float t = uTime * 0.35 + seed * 60.0;
      vec3 centre = aHome + vec3(sin(t) + 0.4 * sin(t * 2.7), 0.35 * sin(t * 1.9 + seed * 7.0), cos(t * 0.7) + 0.4 * cos(t * 2.1)) * vec3(aInfo.w, 1.0, aInfo.w);
      mvPosition = viewMatrix * vec4(centre, 1.0);
      // (the quad is 2 × 1: square it up, so the glow is round)
      mvPosition.xy += vec2(position.x, position.z * 2.0) * aInfo.z;
      float pulse = sin(uTime * (1.3 + fract(seed * 4.1)) + seed * 50.0) * 0.5 + 0.5;
      vShow = smoothstep(0.35, 0.8, uNight) * pulse * pulse;
    }
    // nothing to draw: fold the quad away rather than shade invisible pixels
    if (vShow < 0.01) mvPosition = vec4(0.0, 0.0, 2.0, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uLight;
  varying vec2 vUv;
  varying vec3 vTint;
  varying float vKind;
  varying float vShow;
  #include <fog_pars_fragment>

  void main() {
    vec3 colour;
    float alpha;
    if (vKind < 0.5) {
      // two rounded lobes a side: a big forewing and a smaller hindwing
      vec2 q = vec2(abs(vUv.x), vUv.y);
      float fore = length((q - vec2(0.52, 0.14)) / vec2(0.48, 0.34));
      float hind = length((q - vec2(0.4, -0.24)) / vec2(0.36, 0.25));
      float wing = min(fore, hind);
      if (wing > 1.0) discard;
      // a darker edge and body, a pale spot on each forewing
      colour = vTint * mix(1.0, 0.55, smoothstep(0.72, 1.0, wing)) * (1.0 - 0.6 * smoothstep(0.09, 0.03, q.x));
      colour = mix(colour, vec3(1.0), 0.5 * smoothstep(0.3, 0.1, length(q - vec2(0.6, 0.16)) * 2.4));
      colour *= uLight;
      alpha = vShow;
    } else if (vKind < 1.5) {
      if (length(vUv / vec2(1.0, 0.5)) > 1.0) discard;
      colour = vTint * (0.9 + 0.1 * vUv.x) * uLight;
      alpha = vShow;
    } else {
      float d = length(vUv / vec2(1.0, 0.5));
      float core = smoothstep(0.3, 0.0, d);
      alpha = (smoothstep(1.0, 0.0, d) * 0.45 + core) * vShow;
      colour = vTint * (1.2 + core);
    }
    gl_FragColor = vec4(colour, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function IslandLife() {
  const assets = useMemo(() => {
    const all = creatures();
    // one quad lying flat, split down the middle so the wings can fold: x −1…1 across, z −0.5…0.5 along
    const quad = new THREE.PlaneGeometry(2, 1, 2, 1).rotateX(-Math.PI / 2);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute("position", quad.attributes.position);
    const home = new Float32Array(all.length * 3);
    const info = new Float32Array(all.length * 4);
    const tint = new Float32Array(all.length * 3);
    const colour = new THREE.Color();
    all.forEach((c, i) => {
      home.set([c.x, c.y, c.z], i * 3);
      info.set([hash(i, 231), c.kind, c.size, c.range], i * 4);
      colour.set(c.colour).toArray(tint, i * 3);
    });
    geometry.setAttribute("aHome", new THREE.InstancedBufferAttribute(home, 3));
    geometry.setAttribute("aInfo", new THREE.InstancedBufferAttribute(info, 4));
    geometry.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3));
    geometry.instanceCount = all.length;
    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        { uTime: { value: 0 }, uNight: { value: 0 }, uLight: { value: new THREE.Color("#ffffff") } },
      ]),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      fog: true,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return { geometry, material, quad };
  }, []);
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets]);

  const mesh = useRef<THREE.Mesh>(null);
  const last = useRef(-Infinity);
  useFrame(({ clock }) => {
    const m = mesh.current?.material as THREE.ShaderMaterial | undefined;
    if (!m) return;
    const now = clock.getElapsedTime();
    m.uniforms.uTime.value = now;
    if (now - last.current < 0.25) return;
    last.current = now;
    const sky = skyAt(Date.now());
    m.uniforms.uNight.value = sky.night;
    // wings and petals take the colour of the light, and dim with it
    m.uniforms.uLight.value.set(sky.sunColor).lerp(WHITE, 0.5).multiplyScalar(1 - sky.night * 0.6);
  });

  // the creatures are spread over the whole island: never culled as one (the shader folds away what isn't out)
  return <mesh ref={mesh} geometry={assets.geometry} material={assets.material} frustumCulled={false} renderOrder={2} />;
}

const WHITE = new THREE.Color("#ffffff");
