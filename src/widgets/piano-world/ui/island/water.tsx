"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { quality } from "../quality";
import { skyAt } from "../../engine/day-night";
import { STREAM_ROCKS, WATER_RIPPLES, WATER_RIPPLE_SECONDS, waterRipples } from "../../engine/water";
import { reflectionUniforms, registerSurface } from "./water-reflection";

/**
 * Stylised water: rippling normals from layered noise, a Fresnel blend toward
 * the sky's reflection (which follows the time of day), a sun glint and sheen,
 * and foam where the water meets land — along the beach, the stream's banks,
 * and under the waterfall. Near the shore the bed shows through, sand and
 * pebbles, before the blue deepens. Rings spread from whoever wades in it
 * (engine/water.ts keeps the last few). The stream runs: streaks follow the
 * current, white water spills over the bridge's rails and parts round the
 * boulders standing in it. On capable devices, caustics play over the shallows,
 * sparkles flash on the ripples, and the scene is mirrored softly in the
 * surface (water-reflection.tsx). Fog-aware, so the sea fades into the horizon.
 *
 * One program for all three waters (the kind is a uniform); the tiers differ
 * by defines: LOW_QUALITY (not high) drops caustics, sparkles and lacy foam,
 * MINIMAL also the pebbles and the boulders' wakes, REFLECT (high) adds the mirror.
 */
export type WaterKind = "sea" | "stream" | "pool";

const MODE: Record<WaterKind, number> = { sea: 0, stream: 1, pool: 2 };

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uWaves;
  varying vec3 vWorld;
  /** wave height, −1…1: crests catch a little more light */
  varying float vCrest;
#ifdef REFLECT
  uniform mat4 uReflMatrix;
  varying vec4 vRefl;
#endif
  #include <fog_pars_vertex>
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float w = sin(world.x * 0.18 + uTime * 0.9) * 0.12
            + sin(world.z * 0.23 - uTime * 1.1) * 0.1
            + sin((world.x + world.z) * 0.4 + uTime * 1.7) * 0.04;
    world.y += w * uWaves;
    vCrest = w / 0.26 * uWaves;
    vWorld = world.xyz;
#ifdef REFLECT
    vRefl = uReflMatrix * world;
#endif
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
  /* sea: halfX, zMin, zMax, corner radius | stream: centreX, halfWidth, the bridge rails' z (±) | pool: centreX, centreZ, radius, fallsZ */
  uniform vec4 uShore;
  uniform float uOpacity;
  /** the sand under the shallows */
  uniform vec3 uBed;
  /** rings from someone wading: x, z, start time, strength */
  uniform vec4 uRipples[RIPPLES];
#ifndef MINIMAL
  /** boulders standing in the stream: x, z, radius */
  uniform vec3 uRocks[ROCKS];
#endif
#ifdef REFLECT
  uniform sampler2D uRefl;
  uniform vec2 uReflTexel;
  uniform float uReflOn;
  varying vec4 vRefl;
#endif
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

    // rings spreading from wading feet: a bright crest, a fainter one trailing inside, a push on the ripples
    float rings = 0.0;
    vec2 push = vec2(0.0);
    for (int i = 0; i < RIPPLES; i++) {
      vec4 ring = uRipples[i];
      float age = uTime - ring.z;
      if (ring.w <= 0.0 || age < 0.0 || age > RIPPLE_LIFE) continue;
      vec2 away = p - ring.xy;
      float dist = length(away);
      float front = dist - (0.3 + age * 1.6);
      float fade = 1.0 - age / RIPPLE_LIFE;
      fade *= fade * ring.w;
      rings += (smoothstep(0.17, 0.0, abs(front)) + 0.45 * smoothstep(0.12, 0.0, abs(front + 0.55)) * step(0.35, age)) * fade;
      push += away / max(dist, 0.001) * sin(clamp(front * 8.0, -3.1416, 3.1416)) * fade;
    }
    n = normalize(n + vec3(push.x, 0.0, push.y) * 0.45);

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
    // see-through shallows: by the shore the bed shows, sand and pebbles, wobbling under the ripples
    float clearReach = uMode < 0.5 ? 3.4 : uMode < 1.5 ? 0.75 : 0.55;
    float clear = exp(-shore / clearReach);
    vec3 bed = uBed;
#ifndef MINIMAL
    {
      vec2 g = (p + n.xz * 0.5) * (uMode < 0.5 ? 1.25 : 2.2);
      vec2 id = floor(g);
      float rnd = hash(id);
      vec2 spot = fract(g) - 0.5 - (vec2(rnd, hash(id + 7.3)) - 0.5) * 0.45;
      float size = 0.14 + rnd * 0.2;
      float pebble = smoothstep(size, size - 0.06, length(spot)) * step(0.3, rnd);
      bed *= mix(vec3(1.0), mix(vec3(0.58, 0.57, 0.56), vec3(0.86, 0.76, 0.64), hash(id + 3.1)), pebble);
    }
#endif
    // the water tints what lies under it
    water = mix(water, bed * mix(vec3(1.0), uShallow * 1.3, 0.45), clear * 0.85);
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
      // the current: long streaks running downstream (−z), quick ones midstream, lazy ones by the banks
      float mid = clamp(shore / uShore.y, 0.0, 1.0);
      float slow = smoothstep(0.66, 0.92, noise(vec2(p.x * 3.1, p.y * 0.24 + uTime * 1.5)));
      float quick = smoothstep(0.68, 0.94, noise(vec2(p.x * 5.3 + 4.0, p.y * 0.17 + uTime * 2.9)));
      foam = max(foam, slow * 0.34 + quick * 0.42 * mid);
      float lace = smoothstep(0.3, 0.7, noise(vec2(p.x * 3.0, p.y * 1.3 + uTime * 3.2)));
      // white water spilling over the bridge's two rails: piled up a little above each, churning below
      for (int k = 0; k < 2; k++) {
        float past = (k == 0 ? uShore.z : -uShore.z) - p.y;
        float spill = past > 0.0 ? smoothstep(1.1, 0.0, past) * (0.3 + 0.55 * lace) : smoothstep(0.22, 0.0, -past) * 0.7;
        foam = max(foam, spill);
      }
#ifndef MINIMAL
      // …and parting round the boulders: a collar piled against the upstream face, a wake opening behind
      for (int i = 0; i < ROCKS; i++) {
        vec2 rel = p - uRocks[i].xy;
        float r = uRocks[i].z;
        if (abs(rel.x) > 2.6 || rel.y > 1.6 || rel.y < -6.5) continue;
        float along = -rel.y;
        float collar = smoothstep(r + 0.42, r + 0.06, length(rel)) * (0.3 + 0.7 * smoothstep(-r, r, rel.y));
        float arm = r * 0.85 + along * 0.2;
        float behind = step(0.0, along);
        float wake = smoothstep(0.14 + along * 0.06, 0.0, abs(abs(rel.x) - arm)) * smoothstep(5.5, 0.4, along) * behind * (0.45 + 0.55 * lace);
        float eddy = smoothstep(arm, arm * 0.2, abs(rel.x)) * smoothstep(2.6, 0.2, along) * behind * lace * 0.55;
        foam = max(foam, max(collar, max(wake, eddy)));
      }
#endif
    } else {
      float d = abs(p.y - uShore.w);
      foam = max(foam, smoothstep(1.6, 0.0, d + (churn - 0.5)) * step(abs(p.x - uShore.x), 2.4));
      // rings pushed out across the pool from where the falls land
      float fromFalls = length(vec2(max(abs(p.x - uShore.x) - 1.8, 0.0), p.y - uShore.w - 0.3));
      foam = max(foam, smoothstep(0.7, 1.0, sin(fromFalls * 6.5 - uTime * 4.5)) * smoothstep(3.4, 0.6, fromFalls) * 0.22);
    }
#ifndef LOW_QUALITY
    // bubbly, lacy foam rather than flat white
    foam *= mix(0.55, 1.0, smoothstep(0.25, 0.7, noise(p * 5.5 + vec2(0.0, uTime * 0.4))));
#endif
    foam = clamp(foam, 0.0, 1.0);
    vec3 white = vec3(0.96, 0.98, 1.0) * (1.0 - uDark * 0.55);
    colour = mix(colour, white, foam * 0.85);
    colour = mix(colour, white, clamp(rings, 0.0, 1.0) * 0.6);

    gl_FragColor = vec4(colour, uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
#ifdef REFLECT
    {
      // the mirror: a small picture of the scene, blurred and wobbled by the ripples, laid in weakly
      // (it is already tone-mapped, so it goes in here; where it is empty the sky colour above stays)
      vec2 uv = vRefl.xy / vRefl.w + n.xz * 0.03;
      vec2 t = uReflTexel * 1.5;
      vec4 mirrored = texture2D(uRefl, uv) * 0.3
        + (texture2D(uRefl, uv + vec2(t.x, t.y)) + texture2D(uRefl, uv + vec2(-t.x, t.y))
        + texture2D(uRefl, uv + vec2(t.x, -t.y)) + texture2D(uRefl, uv - vec2(t.x, t.y))) * 0.175;
      float k = uReflOn * (0.24 + 0.5 * fresnel) * (1.0 - foam) * step(0.0, vRefl.w);
      gl_FragColor.rgb = gl_FragColor.rgb * (1.0 - mirrored.a * k) + mirrored.rgb * k;
    }
#endif
    #include <fog_fragment>
  }
`;

const PALETTE: Record<WaterKind, { shallow: string; deep: string; waves: number }> = {
  sea: { shallow: "#5fcfc9", deep: "#1c6a9e", waves: 1 },
  stream: { shallow: "#86dcd6", deep: "#2f8fb5", waves: 0 },
  pool: { shallow: "#9be5df", deep: "#3a98bb", waves: 0 },
};
const NIGHT_WATER = new THREE.Color("#0b1836");
/** The sand and silt under the shallows */
const BED = "#eadfc2";
/** uRocks: x, z, radius of each boulder in the stream (fixed, so one array for every water) */
const ROCKS = new Float32Array(STREAM_ROCKS.flatMap((rock) => [rock.x, rock.z, rock.r]));

function tierDefines() {
  const defines: Record<string, string | number> = {
    RIPPLES: WATER_RIPPLES,
    RIPPLE_LIFE: WATER_RIPPLE_SECONDS.toFixed(2),
    ROCKS: STREAM_ROCKS.length,
  };
  // phones skip the caustics, sparkles and lacy foam (three fewer noise lookups per pixel)
  if (quality.tier !== "high") defines.LOW_QUALITY = "";
  // the CPU renderer also skips the pebbles on the bed and the boulders' wakes
  if (quality.tier === "minimal") defines.MINIMAL = "";
  // only the capable tier mirrors the scene (water-reflection.tsx is mounted only there)
  if (quality.tier === "high") defines.REFLECT = "";
  return defines;
}

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
    const built = new THREE.ShaderMaterial({
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
          uBed: { value: new THREE.Color(BED) },
        },
      ]),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      defines: tierDefines(),
      fog: true,
      transparent: opacity < 1,
      depthWrite: opacity >= 1,
    });
    // shared with every water, by reference (merge above would have copied them):
    // the rings are written in place by the frame loop, the mirror by its own pass
    built.uniforms.uRipples = { value: waterRipples.data };
    built.uniforms.uRocks = { value: ROCKS };
    Object.assign(built.uniforms, reflectionUniforms);
    return built;
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
    m.uniforms.uBed.value.set(BED).lerp(NIGHT_WATER, sky.night * 0.7);
  });

  return (
    // the group is what the mirror hides while it draws (a ref callback: there for as long as the water is)
    <group ref={registerSurface}>
      <mesh ref={mesh} geometry={geometry} material={material} position={position} receiveShadow />
    </group>
  );
}
