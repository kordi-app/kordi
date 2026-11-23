"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { quality } from "../../lib/quality";
import { hash } from "../../model/island";
import { BUSHES, FLOWERS as ALL_FLOWERS, GRASS as ALL_GRASS, ROCKS, TREES, woodland, type Tree } from "../../model/nature";

/**
 * Woods, bushes, rocks, grass and flowers: one instanced mesh per kind (a
 * few draw calls for thousands of plants). Leaves, grass and flowers sway in
 * a shared breeze.
 */

/** Lighter devices draw every n-th tuft and flower */
const thin = <T,>(items: readonly T[]) => items.filter((_, i) => i % quality.undergrowthStride === 0);
const GRASS = thin(ALL_GRASS);
const FLOWERS = thin(ALL_FLOWERS);

/** Shared uniforms (module-level so every nature material reads the same values). */
const wind = { value: 0 };
/** Kordi's position: trees standing between the camera and Kordi turn see-through */
const kordi = { value: new THREE.Vector3() };

/**
 * A standard material whose vertices lean with the breeze (more the higher up
 * they are). With `seeThrough`, the parts that stand between the camera and
 * Kordi are dithered away, so the woods never hide you.
 */
/**
 * Height shading: `[y0, y1, low, high]` darkens the colour toward `low` at
 * local height y0 and lifts it toward `high` at y1 — fake occlusion that
 * grounds grass roots and gives canopies a sunlit crown, for one varying.
 */
type Shade = readonly [y0: number, y1: number, low: number, high: number];

function swaying(params: THREE.MeshStandardMaterialParameters, strength: number, seeThrough = false, shade?: Shade) {
  const material = new THREE.MeshStandardMaterial(params);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.uniforms.uKordi = kordi;
    if (shade) {
      const [y0, y1, low, high] = shade.map((v) => v.toFixed(3));
      shader.vertexShader = `varying float vNatureShade;\n${shader.vertexShader}`.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vNatureShade = mix(${low}, ${high}, smoothstep(${y0}, ${y1}, position.y));`,
      );
      shader.fragmentShader = `varying float vNatureShade;\n${shader.fragmentShader}`.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= vNatureShade;`,
      );
    }
    shader.vertexShader = `uniform float uWind;\nvarying vec3 vNatureWorld;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 root = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
        mat4 placed = modelMatrix * instanceMatrix;
      #else
        vec2 root = vec2(0.0);
        mat4 placed = modelMatrix;
      #endif
      float gust = sin(uWind * 1.6 + root.x * 0.31 + root.y * 0.23) * 0.6 + sin(uWind * 2.7 + root.x * 0.9) * 0.25;
      float lean = max(position.y, 0.0) * ${strength.toFixed(3)};
      transformed.x += gust * lean;
      transformed.z += gust * lean * 0.45;
      vNatureWorld = (placed * vec4(transformed, 1.0)).xyz;`,
    );
    if (seeThrough) {
      shader.fragmentShader = `uniform vec3 uKordi;\nvarying vec3 vNatureWorld;\n${shader.fragmentShader}`.replace(
        "void main() {",
        `void main() {
        // the camera looks down at Kordi from in front (+z): clear a soft column in between
        vec3 toward = vNatureWorld - uKordi;
        float inFront = smoothstep(0.3, 1.5, toward.z) * (1.0 - smoothstep(9.0, 12.0, toward.z));
        float across = 1.0 - smoothstep(1.8, 3.2, abs(toward.x));
        float above = smoothstep(0.6, 1.6, vNatureWorld.y - uKordi.y);
        float clear = inFront * across * above;
        float dither = fract(dot(floor(gl_FragCoord.xy), vec2(0.5, 0.25)) + 0.125);
        if (clear > 0.0 && dither < clear * 0.85) discard;`,
      );
    }
  };
  material.customProgramCacheKey = () => `sway-${strength}-${seeThrough}-${shade?.join(",") ?? ""}`;
  return material;
}

const merge = (parts: THREE.BufferGeometry[]) => {
  const merged = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  parts.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
};

function oakCanopy() {
  return merge([
    new THREE.IcosahedronGeometry(1.5, 1).translate(0, 3.9, 0),
    new THREE.IcosahedronGeometry(1.15, 1).translate(0.95, 3.35, 0.35),
    new THREE.IcosahedronGeometry(1.05, 1).translate(-0.85, 3.45, -0.3),
    new THREE.IcosahedronGeometry(0.95, 1).translate(0.15, 4.75, -0.2),
  ]);
}
function pineFoliage() {
  return merge([
    new THREE.ConeGeometry(1.7, 2.4, 8).translate(0, 2.3, 0),
    new THREE.ConeGeometry(1.35, 2.1, 8).translate(0, 3.5, 0),
    new THREE.ConeGeometry(0.95, 1.8, 8).translate(0, 4.6, 0),
    new THREE.ConeGeometry(0.5, 1.2, 8).translate(0, 5.5, 0),
  ]);
}
function bushShape() {
  return merge([
    new THREE.IcosahedronGeometry(0.75, 1).translate(0, 0.55, 0),
    new THREE.IcosahedronGeometry(0.55, 1).translate(0.6, 0.4, 0.2),
    new THREE.IcosahedronGeometry(0.5, 1).translate(-0.55, 0.38, -0.15),
  ]);
}
function grassTuft() {
  const blades: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const tall = 0.45 + ((i * 37) % 5) * 0.06;
    blades.push(
      new THREE.ConeGeometry(0.045, tall, 3)
        .translate(0, tall / 2, 0)
        .rotateZ(Math.cos(angle) * 0.35)
        .rotateX(Math.sin(angle) * 0.35)
        .translate(Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08),
    );
  }
  return merge(blades);
}

/* Palettes run dark → light, so a 0–1 tint blends smoothly between neighbours. */
const OAK_GREENS = ["#6f9f52", "#7fae5a", "#8fbf63", "#9cc46e"].map((c) => new THREE.Color(c));
const PINE_GREENS = ["#476f52", "#4f7f5a", "#5d8c62"].map((c) => new THREE.Color(c));
const BUSH_GREENS = ["#6c9a50", "#7aa85a", "#86b465"].map((c) => new THREE.Color(c));
const GRASS_GREENS = ["#78a454", "#86b35f", "#9cc46b", "#a9cb79"].map((c) => new THREE.Color(c));
const ROCK_GREYS = ["#938c84", "#a39d94", "#b3ada3"].map((c) => new THREE.Color(c));
const PETALS = ["#ff8fa8", "#ffd166", "#ffffff", "#b39dff", "#ff9f6b", "#8fd3ff"].map((c) => new THREE.Color(c));
const TRUNK = new THREE.Color("#7a5a3c");

type Placed = { x: number; z: number; scale: number; turn: number; tint: number };
/** Where an instance stands: drop below the ground, lean, and stretch (multiplied into the uniform scale). */
type Pose = { sink: number; tiltX: number; tiltZ: number; sx: number; sy: number; sz: number };
type Poser = (item: Placed, i: number, out: Pose) => void;

const upright: Poser = (_, __, out) => {
  out.sink = 0;
  out.tiltX = out.tiltZ = 0;
  out.sx = out.sy = out.sz = 1;
};

function useInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  items: readonly Placed[],
  color?: (i: number, out: THREE.Color) => void,
  pose: Poser = upright,
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    const at = new THREE.Vector3();
    const size = new THREE.Vector3();
    const tone = new THREE.Color();
    const p: Pose = { sink: 0, tiltX: 0, tiltZ: 0, sx: 1, sy: 1, sz: 1 };
    items.forEach((item, i) => {
      upright(item, i, p);
      pose(item, i, p);
      q.setFromEuler(euler.set(p.tiltX, item.turn, p.tiltZ));
      at.set(item.x, -p.sink, item.z);
      size.set(item.scale * p.sx, item.scale * p.sy, item.scale * p.sz);
      mesh.setMatrixAt(i, matrix.compose(at, q, size));
      if (color) {
        color(i, tone);
        mesh.setColorAt(i, tone);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, items, color, pose]);
}

/** Blend smoothly along a palette at `t` (0–1). */
const blend = (palette: THREE.Color[], t: number, out: THREE.Color) => {
  const f = Math.min(0.999, Math.max(0, t)) * (palette.length - 1);
  const k = Math.floor(f);
  return out.copy(palette[k]).lerp(palette[Math.min(palette.length - 1, k + 1)], f - k);
};
/** A small per-instance hue/lightness wobble, so neighbours never match exactly. */
const wobble = (out: THREE.Color, i: number, salt: number, amount: number) =>
  out.offsetHSL((hash(i, salt) - 0.5) * 0.03 * amount, 0, (hash(i, salt + 1) - 0.5) * 0.08 * amount);
/** Signed jitter in −1…1 */
const jitter = (i: number, salt: number) => hash(i, salt) * 2 - 1;

const oaks = TREES.filter((t) => t.kind === "oak");
const pines = TREES.filter((t) => t.kind === "pine");
/** Deep in the woods the leaves run darker; lone trees in the open catch more light. */
const treeTone = (t: Tree) => t.tint * 0.6 + (1 - woodland(t.x, t.z)) * 0.4;
const oakColor = (i: number, out: THREE.Color) => wobble(blend(OAK_GREENS, treeTone(oaks[i]), out), i, 101, 1);
const pineColor = (i: number, out: THREE.Color) => wobble(blend(PINE_GREENS, treeTone(pines[i]), out), i, 103, 1);
const bushColor = (i: number, out: THREE.Color) => wobble(blend(BUSH_GREENS, BUSHES[i].tint, out), i, 105, 1);
const grassColor = (i: number, out: THREE.Color) => {
  const g = GRASS[i];
  return wobble(blend(GRASS_GREENS, g.tint * 0.7 + (1 - woodland(g.x, g.z)) * 0.3, out), i, 107, 1);
};
const rockColor = (i: number, out: THREE.Color) => wobble(blend(ROCK_GREYS, ROCKS[i].tint, out), i, 109, 0.6);
const petalColor = (i: number, out: THREE.Color) =>
  wobble(out.copy(PETALS[Math.min(PETALS.length - 1, Math.floor(FLOWERS[i].tint * PETALS.length))]), i, 111, 0.8);
const trunkColor = (i: number, out: THREE.Color) => wobble(out.copy(TRUNK), i, 113, 1.4);

/* Shapes: trunk and canopy of a tree share one pose, so they stay together. */
const treePose: Poser = (_, i, out) => {
  const wide = 1 + jitter(i, 121) * 0.08;
  out.sx = wide;
  out.sz = 1 + jitter(i, 122) * 0.08;
  out.sy = 1 + jitter(i, 123) * 0.07;
  out.tiltX = jitter(i, 124) * 0.035;
  out.tiltZ = jitter(i, 125) * 0.035;
};
const oakPose: Poser = (item, i, out) => treePose(item, i, out);
const pinePose: Poser = (item, i, out) => treePose(item, i + 5000, out);
const bushPose: Poser = (_, i, out) => {
  out.sx = 1 + jitter(i, 131) * 0.12;
  out.sz = 1 + jitter(i, 132) * 0.12;
  out.sy = 0.88 + hash(i, 133) * 0.22;
  out.sink = 0.05;
};
const rockPose: Poser = (item, i, out) => {
  out.sx = 1.1 * (1 + jitter(i, 141) * 0.12);
  out.sy = 0.7 * (1 + jitter(i, 142) * 0.12);
  out.sz = 0.9 * (1 + jitter(i, 143) * 0.12);
  out.tiltX = jitter(i, 144) * 0.22;
  out.tiltZ = jitter(i, 145) * 0.22;
  // bedded into the ground rather than resting on it
  out.sink = item.scale * 0.08;
};
const grassPose: Poser = (_, i, out) => {
  out.sy = 0.75 + hash(i, 151) * 0.55;
  out.sx = out.sz = 0.9 + hash(i, 152) * 0.25;
  out.tiltX = jitter(i, 153) * 0.14;
  out.tiltZ = jitter(i, 154) * 0.14;
};
const flowerPose: Poser = (_, i, out) => {
  out.sy = 0.8 + hash(i, 161) * 0.45;
  out.tiltX = jitter(i, 162) * 0.12;
  out.tiltZ = jitter(i, 163) * 0.12;
};

function Trees() {
  const oakTrunks = useRef<THREE.InstancedMesh>(null);
  const oakLeaves = useRef<THREE.InstancedMesh>(null);
  const pineTrunks = useRef<THREE.InstancedMesh>(null);
  const pineLeaves = useRef<THREE.InstancedMesh>(null);
  const assets = useMemo(
    () => ({
      oakTrunk: new THREE.CylinderGeometry(0.22, 0.36, 3.4, 7).translate(0, 1.7, 0),
      oakCanopy: oakCanopy(),
      pineTrunk: new THREE.CylinderGeometry(0.18, 0.3, 1.8, 7).translate(0, 0.9, 0),
      pineFoliage: pineFoliage(),
      bark: swaying({ roughness: 0.9 }, 0, true, [0, 2.4, 0.72, 1]),
      leaves: swaying({ roughness: 0.8, flatShading: true }, 0.012, true, [2.4, 5.4, 0.78, 1.1]),
      needles: swaying({ roughness: 0.85, flatShading: true }, 0.008, true, [1.2, 6, 0.75, 1.1]),
    }),
    [],
  );
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets]);
  useInstances(oakTrunks, oaks, trunkColor, oakPose);
  useInstances(oakLeaves, oaks, oakColor, oakPose);
  useInstances(pineTrunks, pines, trunkColor, pinePose);
  useInstances(pineLeaves, pines, pineColor, pinePose);
  return (
    <group>
      <instancedMesh ref={oakTrunks} args={[assets.oakTrunk, assets.bark, oaks.length]} castShadow receiveShadow />
      <instancedMesh ref={oakLeaves} args={[assets.oakCanopy, assets.leaves, oaks.length]} castShadow receiveShadow />
      <instancedMesh ref={pineTrunks} args={[assets.pineTrunk, assets.bark, pines.length]} castShadow receiveShadow />
      <instancedMesh ref={pineLeaves} args={[assets.pineFoliage, assets.needles, pines.length]} castShadow receiveShadow />
    </group>
  );
}

function Undergrowth() {
  const bushes = useRef<THREE.InstancedMesh>(null);
  const rocks = useRef<THREE.InstancedMesh>(null);
  const grass = useRef<THREE.InstancedMesh>(null);
  const stems = useRef<THREE.InstancedMesh>(null);
  const petals = useRef<THREE.InstancedMesh>(null);
  const assets = useMemo(
    () => ({
      bush: bushShape(),
      rock: new THREE.DodecahedronGeometry(1, 0).translate(0, 0.35, 0),
      tuft: grassTuft(),
      stem: new THREE.CylinderGeometry(0.018, 0.022, 0.55, 4).translate(0, 0.275, 0),
      bloom: new THREE.IcosahedronGeometry(0.11, 0).scale(1, 0.6, 1).translate(0, 0.57, 0),
      bushMaterial: swaying({ roughness: 0.85, flatShading: true }, 0.03, false, [0, 1, 0.74, 1.08]),
      rockMaterial: swaying({ roughness: 0.95, flatShading: true }, 0, false, [0, 0.9, 0.8, 1.05]),
      grassMaterial: swaying({ roughness: 0.9 }, 0.22, false, [0, 0.55, 0.62, 1.12]),
      stemMaterial: swaying({ color: "#6f9f52", roughness: 0.9 }, 0.2),
      petalMaterial: swaying({ roughness: 0.6, emissive: "#222222" }, 0.2),
    }),
    [],
  );
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets]);
  useInstances(bushes, BUSHES, bushColor, bushPose);
  useInstances(rocks, ROCKS, rockColor, rockPose);
  useInstances(grass, GRASS, grassColor, grassPose);
  useInstances(stems, FLOWERS, undefined, flowerPose);
  useInstances(petals, FLOWERS, petalColor, flowerPose);
  return (
    <group>
      <instancedMesh ref={bushes} args={[assets.bush, assets.bushMaterial, BUSHES.length]} castShadow receiveShadow />
      <instancedMesh ref={rocks} args={[assets.rock, assets.rockMaterial, ROCKS.length]} castShadow receiveShadow />
      <instancedMesh ref={grass} args={[assets.tuft, assets.grassMaterial, GRASS.length]} receiveShadow />
      <instancedMesh ref={stems} args={[assets.stem, assets.stemMaterial, FLOWERS.length]} />
      <instancedMesh ref={petals} args={[assets.bloom, assets.petalMaterial, FLOWERS.length]} />
    </group>
  );
}

export const NatureScene = memo(function NatureScene({ player }: { player: THREE.Vector3 }) {
  useFrame(({ clock }) => {
    wind.value = clock.getElapsedTime();
    kordi.value.copy(player);
  });
  return (
    <group>
      <Trees />
      <Undergrowth />
    </group>
  );
});
