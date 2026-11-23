"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { quality } from "../../lib/quality";
import { skyAt } from "../../model/day-night";

/**
 * Stylised water: rippling normals from layered noise, a Fresnel blend toward
 * the sky's reflection (which follows the time of day), a sun glint and sheen,
 * and foam where the water meets land — along the beach, the stream's banks,
 * and under the waterfall. On capable devices, caustics play over the shallows
 * and sparkles flash on the ripples. Fog-aware, so the sea fades into the horizon.
 */
export type WaterKind = "sea" | "stream" | "pool";

const MODE: Record<WaterKind, number> = { sea: 0, stream: 1, pool: 2 };

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWaves;
  varying vec3 vWorld;
  /** wave height, −1…1: crests catch a little more light */
  varying float vCrest;
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float w = sin(world.x * 0.18 + uTime * 0.9) * 0.12
            + sin(world.z * 0.23 - uTime * 1.1) * 0.1
            + sin((world.x + world.z) * 0.4 + uTime * 1.7) * 0.04;
    world.y += w * uWaves;
    vCrest = w / 0.26 * uWaves;
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uMode;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSky;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uDark;
  /* sea: halfX, zMin, zMax, corner radius | stream: centreX, halfWidth | pool: centreX, centreZ, radius, fallsZ */
  uniform vec4 uShore;
  uniform float uOpacity;
  varying vec3 vWorld;
  varying float vCrest;
  #include <fog_pars_fragment>

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  vec2 flow() {
    return uMode > 0.5 && uMode < 1.5 ? vec2(0.0, uTime * 1.3) : vec2(uTime * 0.12, uTime * 0.09);
  }
  float ripples(vec2 p) {
    vec2 f = flow();
    return noise(p * 0.35 + f * 0.3) * 0.55 + noise(p * 0.95 - f * 0.6) * 0.3 + noise(p * 2.3 + f) * 0.15;
  }
  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = vWorld.xz;
    float e = 0.2;
    float h = ripples(p);
    float strength = uMode < 0.5 ? 0.9 : 0.6;
    vec3 n = normalize(vec3((h - ripples(p + vec2(e, 0.0))) / e * strength, 1.0, (h - ripples(p + vec2(0.0, e))) / e * strength));
    vec3 V = normalize(cameraPosition - vWorld);
    float fresnel = 0.03 + 0.97 * pow(1.0 - max(dot(n, V), 0.0), 4.0);

    // distance to the water's edge (in world units), for depth colour and foam
    float shore;
    if (uMode < 0.5) {
      vec2 centre = vec2(0.0, (uShore.y + uShore.z) * 0.5);
      vec2 half_ = vec2(uShore.x, (uShore.z - uShore.y) * 0.5);
      shore = max(sdRoundBox(p - centre, half_, uShore.w), 0.0);
    } else if (uMode < 1.5) {
      shore = uShore.y - abs(p.x - uShore.x);
    } else {
      shore = uShore.z - length(p - uShore.xy);
    }
    // depth falls off exponentially: a clear shallow shelf, then the blue deepens steadily
    float reach = uMode < 0.5 ? 7.0 : 1.1;
    float depth = 1.0 - exp(-shore / reach);
    vec3 water = mix(uShallow, uDeep, depth);
    // a band of lighter turquoise where the shelf drops off
    water += (uShallow - uDeep) * 0.18 * smoothstep(0.25, 0.5, depth) * smoothstep(0.85, 0.5, depth) * (1.0 - uDark);
    // crests are a touch lighter, troughs a touch deeper
    water *= 1.0 + vCrest * 0.06;
    vec3 colour = mix(water, uSky, clamp(fresnel * 0.85, 0.0, 1.0));

    vec3 L = normalize(uSunDir);
    vec3 R = reflect(-L, n);
    float facing = max(dot(R, V), 0.0);
    float glint = pow(facing, 160.0);
    colour += uSunColor * glint * 1.6;
    // a broad, soft sheen around the sun's reflection
    colour += uSunColor * pow(facing, 18.0) * 0.08;

#ifndef LOW_QUALITY
    // light caustics dancing on the shallow bottom
    float c1 = noise(p * 1.15 + vec2(uTime * 0.35, uTime * 0.2));
    float c2 = noise(p * 1.4 - vec2(uTime * 0.25, -uTime * 0.3) + 3.7);
    float caustic = smoothstep(0.12, 0.0, abs(c1 - c2));
    colour += vec3(0.9, 1.0, 0.95) * caustic * (1.0 - depth) * 0.16 * (1.0 - uDark * 0.8);
    // sparkles: tiny cells that flash where the ripples face the sun
    vec2 cell = floor(p * 3.0 + flow() * 2.0);
    float flash = step(0.94, hash(cell + floor(uTime * 3.0)));
    colour += uSunColor * flash * pow(facing, 6.0) * 0.6 * (1.0 - uDark * 0.6);
#endif

    // foam: at the edge, broken up by moving noise
    float churn = noise(p * 1.7 + vec2(uTime * 0.7, -uTime * 0.5));
    float band = uMode < 0.5 ? 2.4 : 0.45;
    float foam = smoothstep(band, 0.0, shore + (churn - 0.5) * band);
    if (uMode < 0.5) {
      // the wash: the edge foam breathes in and out with the swell
      float wash = sin(uTime * 0.8 + p.x * 0.05 + p.y * 0.04) * 0.5 + 0.5;
      foam = max(foam, smoothstep(band * (1.0 + wash * 0.6), 0.0, shore + (churn - 0.5) * band) * 0.6);
      // a second, fainter line of surf further out, rolling in
      float swell = sin(shore * 1.4 - uTime * 1.6) * 0.5 + 0.5;
      foam = max(foam, smoothstep(0.82, 1.0, swell) * smoothstep(9.0, 2.0, shore) * churn);
    } else if (uMode < 1.5) {
      float streak = smoothstep(0.72, 0.95, noise(vec2(p.x * 2.6, p.y * 0.35 + uTime * 2.2)));
      foam = max(foam, streak * 0.5);
    } else {
      float d = abs(p.y - uShore.w);
      foam = max(foam, smoothstep(1.6, 0.0, d + (churn - 0.5)) * step(abs(p.x - uShore.x), 2.4));
    }
#ifndef LOW_QUALITY
    // bubbly, lacy foam rather than flat white
    foam *= mix(0.55, 1.0, smoothstep(0.25, 0.7, noise(p * 5.5 + vec2(0.0, uTime * 0.4))));
#endif
    colour = mix(colour, vec3(0.96, 0.98, 1.0) * (1.0 - uDark * 0.55), clamp(foam, 0.0, 1.0) * 0.85);

    gl_FragColor = vec4(colour, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const PALETTE: Record<WaterKind, { shallow: string; deep: string; waves: number }> = {
  sea: { shallow: "#5fcfc9", deep: "#1c6a9e", waves: 1 },
  stream: { shallow: "#86dcd6", deep: "#2f8fb5", waves: 0 },
  pool: { shallow: "#9be5df", deep: "#3a98bb", waves: 0 },
};
const NIGHT_WATER = new THREE.Color("#0b1836");

/**
 * A water surface. Pass a flat geometry lying in x/z (already rotated) and
 * the shore parameters for its kind (see FRAGMENT's uShore).
 */
export function Water({
  kind,
  geometry,
  shore,
  position = [0, 0, 0],
  opacity = 1,
}: {
  kind: WaterKind;
  geometry: THREE.BufferGeometry;
  shore: [number, number, number, number];
  position?: [number, number, number];
  opacity?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const last = useRef(-Infinity);
  const material = useMemo(() => {
    const palette = PALETTE[kind];
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uMode: { value: MODE[kind] },
          uWaves: { value: palette.waves },
          uDeep: { value: new THREE.Color(palette.deep) },
          uShallow: { value: new THREE.Color(palette.shallow) },
          uSky: { value: new THREE.Color("#9fd0ee") },
          uSunDir: { value: new THREE.Vector3(0.3, 0.9, 0.4) },
          uSunColor: { value: new THREE.Color("#ffffff") },
          uDark: { value: 0 },
          uShore: { value: new THREE.Vector4(...shore) },
          uOpacity: { value: opacity },
        },
      ]),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      // phones skip the caustics, sparkles and lacy foam (three fewer noise lookups per pixel)
      defines: quality.tier === "low" ? { LOW_QUALITY: "" } : {},
      fog: true,
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
    });
  }, [kind, shore, opacity]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const m = mesh.current?.material as THREE.ShaderMaterial | undefined;
    if (!m) return;
    const now = clock.getElapsedTime();
    m.uniforms.uTime.value = now;
    if (now - last.current < 0.25) return;
    last.current = now;
    const sky = skyAt(Date.now());
    const palette = PALETTE[kind];
    m.uniforms.uSky.value.set(sky.reflection);
    m.uniforms.uSunColor.value.set(sky.sunColor).multiplyScalar(1 - sky.night * 0.7);
    m.uniforms.uSunDir.value.set(...sky.lightDir);
    m.uniforms.uDark.value = sky.night;
    m.uniforms.uDeep.value.set(palette.deep).lerp(NIGHT_WATER, sky.night * 0.75);
    m.uniforms.uShallow.value.set(palette.shallow).lerp(NIGHT_WATER, sky.night * 0.6);
  });

  return <mesh ref={mesh} geometry={geometry} material={material} position={position} receiveShadow />;
}
