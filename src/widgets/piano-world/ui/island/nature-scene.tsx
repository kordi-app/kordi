"use client";

import { memo, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { quality } from "../../lib/quality";
import { BUSHES, FLOWERS as ALL_FLOWERS, GRASS as ALL_GRASS, ROCKS, TREES, type Prop, type Tree } from "../../model/nature";

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
function swaying(params: THREE.MeshStandardMaterialParameters, strength: number, seeThrough = false) {
  const material = new THREE.MeshStandardMaterial(params);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.uniforms.uKordi = kordi;
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
  material.customProgramCacheKey = () => `sway-${strength}-${seeThrough}`;
  return material;
}

const merge = (parts: THREE.BufferGeometry[]) => {
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
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

const OAK_GREENS = ["#7fae5a", "#8fbf63", "#6f9f52", "#9cc46e"].map((c) => new THREE.Color(c));
const PINE_GREENS = ["#4f7f5a", "#5d8c62", "#476f52"].map((c) => new THREE.Color(c));
const BUSH_GREENS = ["#7aa85a", "#86b465", "#6c9a50"].map((c) => new THREE.Color(c));
const GRASS_GREENS = ["#86b35f", "#9cc46b", "#78a454", "#a9cb79"].map((c) => new THREE.Color(c));
const ROCK_GREYS = ["#a39d94", "#b3ada3", "#938c84"].map((c) => new THREE.Color(c));
const PETALS = ["#ff8fa8", "#ffd166", "#ffffff", "#b39dff", "#ff9f6b", "#8fd3ff"].map((c) => new THREE.Color(c));
const TRUNK = new THREE.Color("#7a5a3c");

type Placed = { x: number; z: number; scale: number; turn: number };

function useInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  items: readonly Placed[],
  color?: (i: number) => THREE.Color,
  shape: (item: Placed) => [number, number, number] = (item) => [item.scale, item.scale, item.scale],
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    items.forEach((item, i) => {
      q.setFromAxisAngle(up, item.turn);
      matrix.compose(new THREE.Vector3(item.x, 0, item.z), q, new THREE.Vector3(...shape(item)));
      mesh.setMatrixAt(i, matrix);
      if (color) mesh.setColorAt(i, color(i));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, items, color, shape]);
}

const pick = (palette: THREE.Color[], t: number) => palette[Math.min(palette.length - 1, Math.floor(t * palette.length))];
const oaks = TREES.filter((t) => t.kind === "oak");
const pines = TREES.filter((t) => t.kind === "pine");
const oakColor = (i: number) => pick(OAK_GREENS, oaks[i].tint);
const pineColor = (i: number) => pick(PINE_GREENS, pines[i].tint);
const bushColor = (i: number) => pick(BUSH_GREENS, BUSHES[i].tint);
const grassColor = (i: number) => pick(GRASS_GREENS, GRASS[i].tint);
const rockColor = (i: number) => pick(ROCK_GREYS, ROCKS[i].tint);
const petalColor = (i: number) => pick(PETALS, FLOWERS[i].tint);
const trunkColor = () => TRUNK;
const rockShape = (r: Placed) => [r.scale * 1.1, r.scale * 0.7, r.scale * 0.9] as [number, number, number];

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
      bark: swaying({ roughness: 0.9 }, 0, true),
      leaves: swaying({ roughness: 0.8, flatShading: true }, 0.012, true),
      needles: swaying({ roughness: 0.85, flatShading: true }, 0.008, true),
    }),
    [],
  );
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets]);
  useInstances(oakTrunks, oaks as readonly Tree[], trunkColor);
  useInstances(oakLeaves, oaks as readonly Tree[], oakColor);
  useInstances(pineTrunks, pines as readonly Tree[], trunkColor);
  useInstances(pineLeaves, pines as readonly Tree[], pineColor);
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
      bushMaterial: swaying({ roughness: 0.85, flatShading: true }, 0.03),
      rockMaterial: new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
      grassMaterial: swaying({ roughness: 0.9 }, 0.22),
      stemMaterial: swaying({ color: "#6f9f52", roughness: 0.9 }, 0.2),
      petalMaterial: swaying({ roughness: 0.6, emissive: "#222222" }, 0.2),
    }),
    [],
  );
  useEffect(() => () => Object.values(assets).forEach((a) => a.dispose()), [assets]);
  useInstances(bushes, BUSHES as readonly Prop[], bushColor);
  useInstances(rocks, ROCKS as readonly Prop[], rockColor, rockShape);
  useInstances(grass, GRASS as readonly Prop[], grassColor);
  useInstances(stems, FLOWERS as readonly Prop[]);
  useInstances(petals, FLOWERS as readonly Prop[], petalColor);
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
