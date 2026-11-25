"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  BALLERINA,
  COMB_BASE,
  CYLINDER,
  CYLINDER_PINS,
  MUSICBOX_BOUNDS,
  MUSICBOX_WALL_TOP,
  TEETH,
  TOOTH_TOP,
  TOOTH_WIDTH,
  WINDING_KEY,
  musicBoxRuntime,
  nextTooth,
  toothTag,
} from "../engine/music-box";
import { mergeParts, paint, sinceHit, useBuilt } from "./island/shared";
import { quality } from "./quality";

/*
 * Inside the music box (engine/music-box.ts): velvet underfoot, wooden walls,
 * the steel comb, the pinned cylinder turning behind it, the ballerina on her
 * pedestal and the winding key in the wall — lit warm and low, like a candle.
 *
 * Three materials draw nearly all of it: one matte (wood, velvet, the
 * ballerina; vertex-coloured), one metal (brass and steel; vertex-coloured)
 * and one glow (the next tooth, the light under the lid). Everything that
 * doesn't move is merged into one mesh per material.
 */

const VELVET = "#7a1f2e";
const VELVET_DEEP = "#5e1423";
const WOOD = "#6e4023";
const WOOD_DARK = "#4a2915";
const WOOD_PALE = "#9a6234";
const BRASS = "#d1a245";
const BRASS_DARK = "#a57a2c";
const STEEL = "#aab3c0";
const GLOW = "#ffd98a";
const LID_LIGHT = "#ffe6b8";
const SKIN = "#f3dcc6";
const TUTU = "#f4b6c8";
const TUTU_DEEP = "#e391ab";
const HAIR = "#5a3a22";

/** Where the walls' inner faces stand: just past where Kordi's body can reach */
const WALL_X = MUSICBOX_BOUNDS.x + 0.5;
const WALL_BACK = MUSICBOX_BOUNDS.zMin - 0.5;
const WALL_THICK = 1.1;
/** The velvet runs on past the walkable floor towards the camera, so no edge shows */
const FLOOR_FRONT = MUSICBOX_BOUNDS.zMax + 8;

/** How fast things turn: idling, and once the box remembers its tune */
const CYLINDER_IDLE = 0.22;
const CYLINDER_PLAYING = 1.1;
const BALLERINA_IDLE = 0.45;
const BALLERINA_DANCING = 2.6;
/** How long the lid's light takes to pour in */
const LIGHT_SECONDS = 2.5;

const hash = (i: number, k: number) => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const lathe = (points: number[][], segments: number) =>
  new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);

/** How far the box has come back to life, 0–1 (eases in after the tune is completed) */
const alive = (now: number) => THREE.MathUtils.clamp((now - musicBoxRuntime.doneAt) / LIGHT_SECONDS, 0, 1);

export function MusicBoxScene() {
  return (
    <>
      <Shell />
      <Brass />
      <Comb />
      <Cylinder />
      <Ballerina />
      <WindingKey />
      <LidLight />
    </>
  );
}

// --- the box itself -------------------------------------------------------------

/** Velvet floor, wooden walls, the ballerina's pedestal: everything matte that never moves */
function shellGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const width = (WALL_X + WALL_THICK) * 2;
  const depth = FLOOR_FRONT - WALL_BACK;
  parts.push(paint(new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2).translate(0, 0, (FLOOR_FRONT + WALL_BACK) / 2), VELVET));
  // a darker border of velvet along the walls, like the lining's seam
  for (const side of [-1, 1]) {
    parts.push(paint(new THREE.PlaneGeometry(0.5, depth).rotateX(-Math.PI / 2).translate(side * (WALL_X - 0.25), 0.004, (FLOOR_FRONT + WALL_BACK) / 2), VELVET_DEEP));
  }
  parts.push(paint(new THREE.PlaneGeometry(WALL_X * 2, 0.5).rotateX(-Math.PI / 2).translate(0, 0.004, WALL_BACK + 0.25), VELVET_DEEP));

  // walls: the back one whole, the side ones running out past the camera
  const wall = (x: number, z: number, w: number, d: number) => {
    parts.push(paint(new THREE.BoxGeometry(w, MUSICBOX_WALL_TOP, d).translate(x, MUSICBOX_WALL_TOP / 2, z), WOOD));
    // a paler rail capping the top edge (standing a little proud of the wall, so the two tops don't fight), and a skirting board
    parts.push(paint(new THREE.BoxGeometry(w + 0.12, 0.28, d + 0.12).translate(x, MUSICBOX_WALL_TOP - 0.1, z), WOOD_PALE));
    parts.push(paint(new THREE.BoxGeometry(w + 0.16, 0.5, d + 0.16).translate(x, 0.25, z), WOOD_DARK));
  };
  wall(0, WALL_BACK - WALL_THICK / 2, width, WALL_THICK);
  for (const side of [-1, 1]) wall(side * (WALL_X + WALL_THICK / 2), (FLOOR_FRONT + WALL_BACK) / 2, WALL_THICK, depth);
  // the back wall's panelling: upright boards
  for (let x = -WALL_X + 1.5; x < WALL_X; x += 3) {
    parts.push(paint(new THREE.BoxGeometry(0.08, MUSICBOX_WALL_TOP - 0.9, 0.06).translate(x, MUSICBOX_WALL_TOP / 2, WALL_BACK + 0.03), WOOD_DARK));
  }

  // the ballerina's pedestal: turned wood
  parts.push(
    paint(
      lathe(
        [
          [BALLERINA.r, 0],
          [BALLERINA.r, 0.16],
          [BALLERINA.r * 0.7, 0.3],
          [BALLERINA.r * 0.62, BALLERINA.top - 0.22],
          [BALLERINA.r * 0.9, BALLERINA.top - 0.1],
          [BALLERINA.r * 0.9, BALLERINA.top],
          [0, BALLERINA.top],
        ],
        20,
      ).translate(BALLERINA.x, 0, BALLERINA.z),
      WOOD_PALE,
    ),
  );
  return mergeParts(parts);
}

function Shell() {
  const geometry = useBuilt(shellGeometry);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  );
}

/** One metal for all the brass and steel (vertex colours pick which) */
const metalMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.45, roughness: 0.38 });

/** The brass that never moves: the comb's base and its screws, the cylinder's bearings, studs in the velvet */
function brassGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  // the comb's base: one bar per tooth, reaching back to that tooth's root (low notes long, high notes short)
  const pitch = TEETH[1].x - TEETH[0].x;
  TEETH.forEach((tooth) => {
    const back = tooth.rootZ - 0.4;
    const depth = COMB_BASE.frontZ - back;
    parts.push(paint(new THREE.BoxGeometry(pitch, COMB_BASE.top, depth).translate(tooth.x, COMB_BASE.top / 2, back + depth / 2), BRASS_DARK));
    // the screw that holds the tooth down
    parts.push(paint(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10).translate(tooth.x, TOOTH_TOP + 0.04, tooth.rootZ - 0.45), BRASS));
  });
  // a bearing block at each end of the cylinder
  for (const side of [-1, 1]) {
    const x = side * (CYLINDER.halfLength + 0.9);
    parts.push(paint(new THREE.BoxGeometry(1.2, CYLINDER.y + 0.5, 2.2).translate(x, (CYLINDER.y + 0.5) / 2, CYLINDER.z), BRASS_DARK));
    parts.push(paint(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 14).rotateZ(Math.PI / 2).translate(x, CYLINDER.y, CYLINDER.z), BRASS));
  }
  // upholstery studs pinning the velvet in a diamond pattern (skipped on the lowest tier)
  if (quality.tier !== "minimal") {
    let row = 0;
    for (let z = MUSICBOX_BOUNDS.zMin + 1.5; z < FLOOR_FRONT - 1; z += 2.6, row++) {
      for (let x = -MUSICBOX_BOUNDS.x + 1.3 + (row % 2) * 1.5; x < MUSICBOX_BOUNDS.x; x += 3) {
        // not under the comb, the cylinder or the pedestal
        if (z < COMB_BASE.frontZ + 0.6 && Math.abs(x) < TEETH[TEETH.length - 1].x + 1.4) continue;
        if (z < CYLINDER.z + CYLINDER.r + 0.4) continue;
        if (Math.hypot(x - BALLERINA.x, z - BALLERINA.z) < BALLERINA.r + 0.4) continue;
        parts.push(paint(new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(x, 0, z), BRASS));
      }
    }
  }
  return mergeParts(parts);
}

function Brass() {
  const geometry = useBuilt(brassGeometry);
  const metal = useBuilt(metalMaterial);
  return <mesh geometry={geometry} material={metal} castShadow receiveShadow />;
}

// --- the comb -------------------------------------------------------------------

/** A struck tooth quivers this long */
const QUIVER_SECONDS = 0.7;

/** Lay tooth i down in the instanced mesh, bent by `bend` radians at its root */
function placeTooth(m: THREE.InstancedMesh, dummy: THREE.Object3D, i: number, bend: number) {
  const tooth = TEETH[i];
  dummy.position.set(tooth.x, TOOTH_TOP - 0.1, tooth.rootZ);
  dummy.rotation.set(bend, 0, 0);
  dummy.scale.set(TOOTH_WIDTH, 0.2, tooth.rootZ - tooth.tipZ);
  dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
}

/**
 * The steel teeth: one instanced mesh. Each is hinged at its root (the unit
 * box reaches from z = 0 back to z = −1), so a struck tooth quivers about the
 * screw that holds it; and the next tooth of the tune wears a glowing plate.
 */
function Comb() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const plate = useRef<THREE.Mesh>(null);
  const hinge = useBuilt(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, -0.5));
  const steel = useBuilt(() => new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.5, roughness: 0.3 }));
  const glow = useBuilt(
    () => new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  const scratch = useRef({ dummy: new THREE.Object3D(), moving: true });

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    TEETH.forEach((_, i) => placeTooth(m, scratch.current.dummy, i, 0));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    const m = mesh.current;
    if (m) {
      // only touch the instance buffer while something is quivering (and once more, to lay it flat)
      let moving = false;
      TEETH.forEach((_, i) => {
        const since = sinceHit(toothTag(i), now);
        const ringing = since < QUIVER_SECONDS;
        if (!ringing && !scratch.current.moving) return;
        moving ||= ringing;
        placeTooth(m, scratch.current.dummy, i, ringing ? Math.sin(since * 46) * 0.035 * (1 - since / QUIVER_SECONDS) : 0);
        m.instanceMatrix.needsUpdate = true;
      });
      scratch.current.moving = moving;
    }
    const p = plate.current;
    if (p) {
      const next = nextTooth();
      p.visible = next !== null;
      if (next !== null) {
        const tooth = TEETH[next];
        const length = tooth.rootZ - tooth.tipZ;
        p.position.set(tooth.x, TOOTH_TOP + 0.02, tooth.tipZ + length / 2);
        p.scale.set(TOOTH_WIDTH, length, 1);
        (p.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(now * 4.5) * 0.3;
      }
    }
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[hinge, steel, TEETH.length]} castShadow receiveShadow />
      <mesh ref={plate} material={glow} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  );
}

// --- the cylinder ---------------------------------------------------------------

/** The cylinder with its pins, lying along x (origin: its axis) */
function cylinderGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const along = (g: THREE.BufferGeometry) => g.rotateZ(Math.PI / 2);
  parts.push(paint(along(new THREE.CylinderGeometry(CYLINDER.r, CYLINDER.r, CYLINDER.halfLength * 2, 28)), BRASS));
  for (const side of [-1, 1]) {
    // a rim at each end, and the axle
    parts.push(paint(along(new THREE.CylinderGeometry(CYLINDER.r + 0.12, CYLINDER.r + 0.12, 0.3, 28)).translate(side * CYLINDER.halfLength, 0, 0), BRASS_DARK));
    parts.push(paint(along(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 10)).translate(side * (CYLINDER.halfLength + 0.5), 0, 0), STEEL));
  }
  const pin = (x: number, angle: number, color: string) => {
    // a pin stands out of the surface; angle 0 is the one facing the comb's tips at rest
    const g = new THREE.CylinderGeometry(0.07, 0.09, 0.42, 6).translate(0, CYLINDER.r + 0.16, 0).rotateX(Math.PI / 2 - angle);
    parts.push(paint(g.translate(x, 0, 0), color));
  };
  // the tune's own pins, bright…
  CYLINDER_PINS.forEach((p) => pin(p.x, p.angle, STEEL));
  // …among the many of the tune's other voices (a real cylinder is thick with them)
  const extras = quality.tier === "minimal" ? 16 : 44;
  for (let i = 0; i < extras; i++) {
    const tooth = TEETH[Math.floor(hash(i, 3) * TEETH.length)];
    pin(tooth.x + (hash(i, 4) - 0.5) * 0.9, hash(i, 5) * Math.PI * 2, BRASS_DARK);
  }
  return mergeParts(parts);
}

function Cylinder() {
  const group = useRef<THREE.Mesh>(null);
  const geometry = useBuilt(cylinderGeometry);
  const metal = useBuilt(metalMaterial);
  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    const speed = THREE.MathUtils.lerp(CYLINDER_IDLE, CYLINDER_PLAYING, alive(clock.getElapsedTime()));
    // turning so the pins on the comb's side rise past the teeth's tips
    group.current.rotation.x -= speed * dt;
  });
  return <mesh ref={group} geometry={geometry} material={metal} position={[0, CYLINDER.y, CYLINDER.z]} castShadow />;
}

// --- the ballerina --------------------------------------------------------------

/** The figurine on her turntable (origin: the middle of the pedestal's top), arms raised in a ring, on one toe */
function ballerinaGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(new THREE.CylinderGeometry(0.75, 0.8, 0.12, 20).translate(0, 0.06, 0), BRASS));
  // the standing leg, on pointe; the other drawn up, toe to knee
  parts.push(paint(new THREE.CylinderGeometry(0.075, 0.05, 1.15, 6).translate(0.02, 0.7, 0), SKIN));
  parts.push(paint(new THREE.CylinderGeometry(0.07, 0.06, 0.62, 6).rotateZ(-0.95).translate(0.3, 1.12, 0), SKIN));
  parts.push(paint(new THREE.CylinderGeometry(0.06, 0.045, 0.6, 6).rotateZ(0.75).translate(0.33, 0.78, 0), SKIN));
  // the tutu: two stiff layers
  parts.push(paint(new THREE.CylinderGeometry(0.22, 0.95, 0.16, 16).translate(0, 1.36, 0), TUTU));
  parts.push(paint(new THREE.CylinderGeometry(0.2, 0.72, 0.14, 16).translate(0, 1.47, 0), TUTU_DEEP));
  // bodice, neck, head, bun
  parts.push(paint(new THREE.CylinderGeometry(0.2, 0.15, 0.6, 10).translate(0, 1.8, 0), TUTU_DEEP));
  parts.push(paint(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 6).translate(0, 2.16, 0), SKIN));
  parts.push(paint(new THREE.SphereGeometry(0.21, 12, 10).translate(0, 2.4, 0), SKIN));
  parts.push(paint(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 2.44, -0.03), HAIR));
  parts.push(paint(new THREE.SphereGeometry(0.1, 8, 6).translate(0, 2.66, -0.06), HAIR));
  // arms: a ring held over the head
  parts.push(paint(new THREE.TorusGeometry(0.42, 0.05, 6, 16, Math.PI * 1.55).rotateZ(-Math.PI * 0.275).translate(0, 2.42, 0), SKIN));
  return mergeParts(parts);
}

function Ballerina() {
  const figure = useRef<THREE.Mesh>(null);
  const geometry = useBuilt(ballerinaGeometry);
  useFrame(({ clock }, dt) => {
    const f = figure.current;
    if (!f) return;
    const now = clock.getElapsedTime();
    const life = alive(now);
    f.rotation.y += THREE.MathUtils.lerp(BALLERINA_IDLE, BALLERINA_DANCING, life) * dt;
    // dancing: she rises and dips and sways as she spins
    f.position.y = BALLERINA.top + life * (0.12 + Math.abs(Math.sin(now * 3.3)) * 0.22);
    f.rotation.z = life * Math.sin(now * 1.65) * 0.14;
  });
  return (
    <mesh ref={figure} geometry={geometry} position={[BALLERINA.x, BALLERINA.top, BALLERINA.z]} scale={1.25} castShadow>
      <meshStandardMaterial vertexColors roughness={0.6} />
    </mesh>
  );
}

// --- the winding key ------------------------------------------------------------

/** The key through the east wall: a shaft and a butterfly grip (origin: where the shaft leaves the wall; it points −x, into the box) */
function keyGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(new THREE.CylinderGeometry(0.16, 0.16, 1.5, 10).rotateZ(Math.PI / 2).translate(-0.75, 0, 0), BRASS_DARK));
  parts.push(paint(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 14).rotateZ(Math.PI / 2).translate(-0.08, 0, 0), BRASS));
  for (const side of [-1, 1]) {
    parts.push(paint(new THREE.TorusGeometry(0.62, 0.15, 8, 18).rotateY(Math.PI / 2).translate(-1.5, side * 0.72, 0), BRASS));
  }
  parts.push(paint(new THREE.SphereGeometry(0.26, 10, 8).translate(-1.5, 0, 0), BRASS_DARK));
  return mergeParts(parts);
}

function WindingKey() {
  const key = useRef<THREE.Mesh>(null);
  const geometry = useBuilt(keyGeometry);
  const metal = useBuilt(metalMaterial);
  useFrame(({ clock }) => {
    if (!key.current) return;
    const now = clock.getElapsedTime();
    // it unwinds in ticks, as a spring lets go; quicker while the box plays
    const rate = THREE.MathUtils.lerp(0.5, 2.2, alive(now));
    const turns = now * rate;
    key.current.rotation.x = (Math.floor(turns) + THREE.MathUtils.smoothstep(turns % 1, 0, 0.35)) * (Math.PI / 4);
  });
  return <mesh ref={key} geometry={geometry} material={metal} position={[WALL_X, WINDING_KEY.y, WINDING_KEY.z]} castShadow />;
}

// --- light ----------------------------------------------------------------------

/** Shafts of light slanting down from the gap under the lid: this many */
const SHAFTS = quality.tier === "minimal" ? 3 : 6;

/** The lit gap along the top of the back wall, and the shafts that fall from it (one additive mesh; colour is brightness) */
function lidLightGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(new THREE.PlaneGeometry(WALL_X * 2, 0.7).translate(0, MUSICBOX_WALL_TOP + 0.35, WALL_BACK + 0.02), "#ffffff"));
  // each shaft: a long thin sheet from the gap down to the velvet, leaning into the room
  const fromY = MUSICBOX_WALL_TOP + 0.3;
  for (let i = 0; i < SHAFTS; i++) {
    const x = (i + 0.5 - SHAFTS / 2) * ((WALL_X * 2 - 5) / SHAFTS) + (hash(i, 1) - 0.5) * 1.2;
    const reach = 9 + hash(i, 2) * 7;
    const length = Math.hypot(fromY, reach);
    const sheet = new THREE.PlaneGeometry(1.6 + hash(i, 3) * 1.6, length, 2, 1)
      .translate(0, -length / 2, 0)
      .rotateX(-Math.atan2(reach, fromY))
      .translate(x, fromY, WALL_BACK + 0.1);
    // soft-edged: brightest down the middle at the gap, fading to nothing at the sides and by the time it reaches the floor
    // (the plane's vertices run in rows of three: left, middle, right; the top row first)
    const strength = 0.16 + hash(i, 4) * 0.1;
    const shade = new Float32Array(6 * 3);
    [0, strength, 0, 0, 0, 0].forEach((v, k) => shade.fill(v, k * 3, k * 3 + 3));
    sheet.setAttribute("color", new THREE.BufferAttribute(shade, 3));
    parts.push(sheet);
  }
  return mergeParts(parts);
}

/**
 * The room's light: a candle's warm, unsteady glow from the start; and the
 * daylight that pours in under the lid once the box plays again — the gap
 * brightens, shafts fall across the comb, and the whole room lifts.
 */
function LidLight() {
  const geometry = useBuilt(lidLightGeometry);
  const glow = useBuilt(
    () =>
      new THREE.MeshBasicMaterial({
        color: LID_LIGHT,
        vertexColors: true,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
        fog: false,
      }),
  );
  const gap = useRef<THREE.Mesh>(null);
  const candle = useRef<THREE.PointLight>(null);
  const day = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    const life = alive(now);
    // a sliver of light under the lid all along; all of it once the tune is whole
    if (gap.current) (gap.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + life * (0.8 + Math.sin(now * 1.3) * 0.06);
    if (candle.current) candle.current.intensity = 55 * (1 + Math.sin(now * 9.1) * 0.05 + Math.sin(now * 14.7) * 0.03);
    if (day.current) day.current.intensity = life * 160;
  });
  return (
    <>
      <mesh ref={gap} geometry={geometry} material={glow} />
      <pointLight ref={candle} color="#ffb76a" position={[-6.5, 4.2, 6]} intensity={55} distance={40} decay={1.7} />
      {/* mounted from the start at no brightness, so its arrival compiles nothing */}
      <pointLight ref={day} color={LID_LIGHT} position={[0, MUSICBOX_WALL_TOP + 2, WALL_BACK + 4]} intensity={0} distance={50} decay={1.5} />
    </>
  );
}
