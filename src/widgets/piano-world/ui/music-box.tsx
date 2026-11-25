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
  TUNE,
  WINDING_KEY,
  musicBoxRuntime,
  nextTooth,
  TOOTH_TAGS,
} from "../engine/music-box";
import { REGIONS } from "../engine/regions";
import { mergeParts, paint, sinceHit, useBuilt } from "./island/shared";
import { quality } from "./quality";

/*
 * Inside the music box (engine/music-box.ts): velvet underfoot, wooden walls,
 * the steel comb, the pinned cylinder turning behind it, the ballerina on her
 * pedestal and the winding key in the wall — lit warm and low, like a candle.
 *
 * It is a made thing, so what tells is material and workmanship: buttoned
 * velvet with a sheen, lacquered wood with its grain and a band of marquetry,
 * polished brass that holds the room's light, screws with slots, a maker's
 * plate. Four lit materials draw nearly all of it — velvet, lacquer, metal
 * (brass and steel; vertex-coloured), porcelain — plus the comb's steel; the
 * lacquer and the metal are built alike (colour map, vertex colours, the same
 * small picture of the room to reflect), so they compile once between them.
 * Everything that doesn't move is merged into one mesh per material.
 */

const VELVET = "#84202f";
const VELVET_DEEP = "#641626";
const WOOD = "#7a4727";
const WOOD_DARK = "#52301a";
const WOOD_PALE = "#a86c3a";
const EBONY = "#2a1a12";
const BOXWOOD = "#dcb77a";
const BRASS = "#d9aa4c";
const BRASS_DARK = "#a57a2c";
const BRASS_SHADOW = "#4a3410";
const STEEL = "#b4bcc8";
const GLOW = "#ffd98a";
const LID_LIGHT = "#ffe6b8";
const SKIN = "#f3dcc6";
const TUTU = "#f4b6c8";
const TUTU_DEEP = "#e391ab";
const HAIR = "#5a3a22";
const PEARL = "#f4efe6";

/** Reflections, sheen and the smallest ornaments are for machines that can afford them */
const RICH = quality.tier !== "minimal";
const byTier = (high: number, low: number, minimal: number) => (quality.tier === "high" ? high : quality.tier === "low" ? low : minimal);

/** Where the walls' inner faces stand: just past where Kordi's body can reach */
const WALL_X = MUSICBOX_BOUNDS.x + 0.5;
const WALL_BACK = MUSICBOX_BOUNDS.zMin - 0.5;
const WALL_THICK = 1.1;
/** The velvet runs on past the walkable floor towards the camera, so no edge shows */
const FLOOR_FRONT = MUSICBOX_BOUNDS.zMax + 8;

/** The velvet is buttoned down in a diamond pattern: a stud every this far along a row, rows this far apart, every other row shifted half a step */
const STUDS = { x0: -MUSICBOX_BOUNDS.x + 1.3, z0: MUSICBOX_BOUNDS.zMin + 1.5, stepX: 3, stepZ: 2.6 };

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

/**
 * When a pin of the turning cylinder last plucked each tooth (on the frame
 * clock; written by the cylinder, read by the comb and the sparks). Only once
 * the box is playing: until then the pins pass the teeth without a sound.
 */
const pluckedAt: number[] = TEETH.map(() => -Infinity);

// --- pictures ---------------------------------------------------------------------

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext("2d")!] as const;
}

const painted = (canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

/**
 * The velvet's nap, one repeat of its buttoning (a stud at each corner and
 * one in the middle): brushed unevenly, seamed stud to stud, pulled down into
 * a dimple at each stud. Greys: the velvet's colour multiplies it.
 */
function velvetTexture() {
  const W = 256;
  const H = Math.round((W * STUDS.stepZ * 2) / STUDS.stepX);
  const [canvas, ctx] = canvasOf(W, H);
  ctx.fillStyle = "#e6e6e6";
  ctx.fillRect(0, 0, W, H);
  // drawn again one repeat over in every direction, so the picture tiles
  const tiled = (draw: (dx: number, dy: number) => void) => {
    for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) draw(dx, dy);
  };
  for (let i = 0; i < 150; i++) {
    const x = hash(i, 1) * W;
    const y = hash(i, 2) * H;
    const r = 14 + hash(i, 3) * 44;
    const tone = hash(i, 4) > 0.5 ? "255,255,255" : "0,0,0";
    tiled((dx, dy) => {
      const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, `rgba(${tone},0.09)`);
      g.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    });
  }
  ctx.lineCap = "round";
  for (const [width, style, shift] of [
    [16, "rgba(0,0,0,0.07)", 0],
    [6, "rgba(0,0,0,0.16)", 0],
    [1.6, "rgba(255,255,255,0.14)", -3],
  ] as const) {
    ctx.lineWidth = width;
    ctx.strokeStyle = style;
    ctx.beginPath();
    ctx.moveTo(0, shift);
    ctx.lineTo(W, H + shift);
    ctx.moveTo(W, shift);
    ctx.lineTo(0, H + shift);
    ctx.stroke();
  }
  for (const [x, y] of [
    [0, 0],
    [W, 0],
    [0, H],
    [W, H],
    [W / 2, H / 2],
  ]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 34);
    g.addColorStop(0, "rgba(0,0,0,0.5)");
    g.addColorStop(0.4, "rgba(0,0,0,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 34, y - 34, 68, 68);
  }
  const texture = painted(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Wood grain, running along a board's length (greys: the wood's colour multiplies it) */
function woodTexture() {
  const S = 256;
  const [canvas, ctx] = canvasOf(S, S);
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 120; i++) {
    const y = hash(i, 11) * S;
    const drift = (hash(i, 12) - 0.5) * 10;
    ctx.lineWidth = 0.6 + hash(i, 13) * 2.4;
    ctx.strokeStyle = hash(i, 14) > 0.25 ? `rgba(40,16,0,${0.03 + hash(i, 15) * 0.09})` : `rgba(255,236,200,${0.04 + hash(i, 15) * 0.07})`;
    ctx.beginPath();
    // each line ends at the height it began: the grain carries on from board to board
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(S * 0.3, y + drift, S * 0.7, y - drift, S, y);
    ctx.stroke();
  }
  const texture = painted(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * What the brass has engraved on it, on one sheet (white wherever nothing is:
 * every plain piece of metal looks up the same white corner). Left: the
 * maker's plate. Along the bottom: the comb's note names, tooth by tooth.
 */
const ENGRAVED = {
  plate: [0, 0.5, 0.75, 1],
  plain: [0.94, 0.88],
  note: (i: number) => [i / 8, 0.125, (i + 1) / 8, 0.375],
} as const;
const NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B", "C"];

function engravingTexture() {
  const [canvas, ctx] = canvasOf(512, 256);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 512, 256);
  const cut = "#5a3c10";
  // the plate: a ruled border with a dot in each corner, the maker, the tune
  ctx.strokeStyle = cut;
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 364, 108);
  ctx.lineWidth = 1.2;
  ctx.strokeRect(17, 17, 350, 94);
  ctx.fillStyle = cut;
  for (const [x, y] of [
    [28, 28],
    [356, 28],
    [28, 100],
    [356, 100],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "600 34px Georgia, 'Times New Roman', serif";
  ctx.fillText("K O R D I", 192, 48);
  ctx.font = "italic 19px Georgia, 'Times New Roman', serif";
  ctx.fillText("Twinkle, Twinkle, Little Star", 192, 82);
  ctx.font = "12px Georgia, 'Times New Roman', serif";
  ctx.fillText("✦  8 NOTES  ·  No. 84  ✦", 192, 102);
  ctx.font = "600 46px Georgia, 'Times New Roman', serif";
  NOTE_NAMES.forEach((name, i) => ctx.fillText(name, i * 64 + 32, 192));
  return painted(canvas);
}

/**
 * The room as polished metal sees it, all the way round: the lid's light
 * above, warm wood at eye level, the velvet's red below, a candle to one side.
 */
function roomReflection() {
  const [canvas, ctx] = canvasOf(256, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "#fff3d6");
  g.addColorStop(0.16, "#f1c98a");
  g.addColorStop(0.36, "#9a5a26");
  g.addColorStop(0.58, "#4e2414");
  g.addColorStop(1, "#4a0f1a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  const candle = ctx.createRadialGradient(84, 44, 0, 84, 44, 30);
  candle.addColorStop(0, "rgba(255,240,200,1)");
  candle.addColorStop(0.3, "rgba(255,190,110,0.6)");
  candle.addColorStop(1, "rgba(255,170,90,0)");
  ctx.fillStyle = candle;
  ctx.fillRect(40, 0, 100, 100);
  const texture = painted(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

/** The picture on the back wall, six times as wide as it is tall: what the statue dreams — itself, asleep under the moon in its ring of stones */
function dreamPainting() {
  const W = 768;
  const H = 128;
  const [canvas, ctx] = canvasOf(W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#141d4a");
  sky.addColorStop(0.55, "#3b4c8c");
  sky.addColorStop(0.85, "#c98f7a");
  sky.addColorStop(1, "#f0c48c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,244,214,${0.4 + hash(i, 21) * 0.6})`;
    const r = 0.6 + hash(i, 22) * 1.3;
    ctx.beginPath();
    ctx.arc(hash(i, 23) * W, hash(i, 24) ** 1.6 * H * 0.7, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // the moon, and its glow
  const halo = ctx.createRadialGradient(560, 38, 0, 560, 38, 60);
  halo.addColorStop(0, "rgba(255,244,210,0.5)");
  halo.addColorStop(1, "rgba(255,244,210,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(500, 0, 120, 100);
  ctx.fillStyle = "#fff4d2";
  ctx.beginPath();
  ctx.arc(560, 38, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#26357a";
  ctx.beginPath();
  ctx.arc(568, 33, 15, 0, Math.PI * 2);
  ctx.fill();
  // hills, far and near
  const hill = (color: string, base: number, swell: number, phase: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, base - Math.sin(x / 90 + phase) * swell - Math.sin(x / 37 + phase * 2) * swell * 0.3);
    ctx.lineTo(W, H);
    ctx.fill();
  };
  hill("#2a3566", 92, 12, 0.4);
  hill("#18224a", 106, 9, 2.2);
  // the ring of stones on the near hill, and the sleeper in the middle of it
  ctx.fillStyle = "#0f1734";
  for (const [x, tall] of [
    [318, 20],
    [338, 26],
    [432, 27],
    [452, 19],
    [360, 16],
    [410, 15],
  ]) {
    ctx.fillRect(x, 104 - tall, 8, tall + 6);
  }
  ctx.fillStyle = "#d9d3c4";
  ctx.beginPath();
  ctx.ellipse(385, 88, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#3a3a52";
  ctx.lineWidth = 1.4;
  for (const x of [381, 389]) {
    ctx.beginPath();
    ctx.arc(x, 84, 2.4, 0, Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffe9a8";
  ctx.font = "italic 600 13px Georgia, serif";
  ctx.fillText("z", 400, 70);
  ctx.font = "italic 600 17px Georgia, serif";
  ctx.fillText("z", 408, 58);
  return painted(canvas);
}

/** A round soft dot: dust in the light */
function dotTexture() {
  const [canvas, ctx] = canvasOf(32, 32);
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.6)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

// --- materials --------------------------------------------------------------------

/** Points a flat piece's texture coordinates at one rectangle of a picture */
function mapTo(geometry: THREE.BufferGeometry, [u0, v0, u1, v1]: readonly number[]) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, THREE.MathUtils.lerp(u0, u1, uv.getX(i)), THREE.MathUtils.lerp(v0, v1, uv.getY(i)));
  return geometry;
}

/** A piece of plain metal in this colour: nothing engraved on it */
function metal(geometry: THREE.BufferGeometry, color: string) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ENGRAVED.plain[0], ENGRAVED.plain[1]);
  return paint(geometry, color);
}

/** Everything the room's materials share, built once for the scene */
function buildMaterials() {
  const velvetMap = velvetTexture();
  const woodMap = woodTexture();
  const engraving = engravingTexture();
  const reflection = RICH ? roomReflection() : null;
  const velvetLook = { vertexColors: true, map: velvetMap, roughness: 0.96 };
  const built = {
    // plush: dull straight on, a soft bloom of light where you look along the pile
    velvet: RICH
      ? new THREE.MeshPhysicalMaterial({ ...velvetLook, sheen: 0.55, sheenRoughness: 0.55, sheenColor: new THREE.Color("#d8475f") })
      : new THREE.MeshStandardMaterial(velvetLook),
    // lacquered: the grain shows through a hard, glossy coat
    wood: new THREE.MeshStandardMaterial({ vertexColors: true, map: woodMap, roughness: RICH ? 0.34 : 0.6, envMap: reflection, envMapIntensity: 0.3 }),
    // polished brass, and the bright steel set into it. Without a room to reflect, polished metal is only dark: keep it half-way to paint there
    metal: new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: engraving,
      metalness: RICH ? 0.92 : 0.45,
      roughness: RICH ? 0.24 : 0.38,
      envMap: reflection,
      envMapIntensity: 1.15,
    }),
    // the comb: brushed, so it holds a broad soft light instead of a sharp one
    steel: new THREE.MeshStandardMaterial({ color: STEEL, metalness: RICH ? 0.85 : 0.5, roughness: RICH ? 0.46 : 0.3, envMap: reflection, envMapIntensity: 0.9 }),
    // the ballerina and the pearls: glazed
    porcelain: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32 }),
    /** light that fades in and out by its own opacity, wherever it is used */
    spark: new THREE.MeshBasicMaterial({ color: GLOW, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    dispose() {
      for (const texture of [velvetMap, woodMap, engraving, reflection]) texture?.dispose();
      for (const material of [built.velvet, built.wood, built.metal, built.steel, built.porcelain, built.spark]) material.dispose();
    },
  };
  return built;
}

type Materials = ReturnType<typeof buildMaterials>;

export function MusicBoxScene() {
  const materials = useBuilt(buildMaterials);
  return (
    <>
      <Shell materials={materials} />
      <Brass materials={materials} />
      <Comb materials={materials} />
      <Cylinder materials={materials} />
      <Ballerina materials={materials} />
      <WindingKey materials={materials} />
      <Sparks materials={materials} />
      <LidLight />
    </>
  );
}

// --- the box itself -------------------------------------------------------------

/** The lining: velvet buttoned down across the floor, a darker seam where it meets the walls */
function velvetGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const width = (WALL_X + WALL_THICK) * 2;
  const depth = FLOOR_FRONT - WALL_BACK;
  const mid = (FLOOR_FRONT + WALL_BACK) / 2;
  const floor = new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2).translate(0, 0, mid);
  // the buttoning's picture repeats with the studs: one repeat per stud across, per two rows deep
  const position = floor.attributes.position;
  for (let i = 0; i < position.count; i++) {
    floor.attributes.uv.setXY(i, (position.getX(i) - STUDS.x0) / STUDS.stepX, (position.getZ(i) - STUDS.z0) / (STUDS.stepZ * 2));
  }
  parts.push(paint(floor, VELVET));
  for (const side of [-1, 1]) {
    parts.push(paint(new THREE.PlaneGeometry(0.5, depth).rotateX(-Math.PI / 2).translate(side * (WALL_X - 0.25), 0.004, mid), VELVET_DEEP));
  }
  parts.push(paint(new THREE.PlaneGeometry(WALL_X * 2, 0.5).rotateX(-Math.PI / 2).translate(0, 0.004, WALL_BACK + 0.25), VELVET_DEEP));
  // a little cushion of it under the ballerina's turntable
  parts.push(paint(new THREE.CylinderGeometry(BALLERINA.r * 0.84, BALLERINA.r * 0.88, 0.06, 20).translate(BALLERINA.x, BALLERINA.top + 0.01, BALLERINA.z), VELVET_DEEP));
  return mergeParts(parts);
}

/** Where the dream is painted on the back wall, over the cylinder */
const PAINTING = { width: 11.4, height: 1.9, y: MUSICBOX_WALL_TOP - 1.25 };

/** Wooden walls, the ballerina's pedestal, the lid's edge: everything lacquered that never moves */
function woodGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const width = (WALL_X + WALL_THICK) * 2;
  const depth = FLOOR_FRONT - WALL_BACK;
  const mid = (FLOOR_FRONT + WALL_BACK) / 2;

  // walls: the back one whole, the side ones running out past the camera
  const wall = (x: number, z: number, w: number, d: number) => {
    parts.push(paint(new THREE.BoxGeometry(w, MUSICBOX_WALL_TOP, d).translate(x, MUSICBOX_WALL_TOP / 2, z), WOOD));
    // a paler rail capping the top edge (standing a little proud of the wall, so the two tops don't fight), and a skirting board
    parts.push(paint(new THREE.BoxGeometry(w + 0.12, 0.28, d + 0.12).translate(x, MUSICBOX_WALL_TOP - 0.1, z), WOOD_PALE));
    parts.push(paint(new THREE.BoxGeometry(w + 0.16, 0.5, d + 0.16).translate(x, 0.25, z), WOOD_DARK));
    parts.push(paint(new THREE.BoxGeometry(w + 0.22, 0.1, d + 0.22).translate(x, 0.55, z), WOOD_PALE));
  };
  wall(0, WALL_BACK - WALL_THICK / 2, width, WALL_THICK);
  for (const side of [-1, 1]) wall(side * (WALL_X + WALL_THICK / 2), mid, WALL_THICK, depth);

  // panelling, laid on each inner face (made facing +z along the back wall, then turned to the side walls)
  const faces: [turn: number, at: number, from: number, to: number][] = [
    [0, WALL_BACK, -WALL_X, WALL_X],
    [Math.PI / 2, -WALL_X, -FLOOR_FRONT, -WALL_BACK],
    [-Math.PI / 2, -WALL_X, WALL_BACK, FLOOR_FRONT],
  ];
  for (const [turn, at, from, to] of faces) {
    const on = (g: THREE.BufferGeometry, color: string) => parts.push(paint(g.translate(0, 0, at).rotateY(turn), color));
    // upright stiles, and a dado rail between them
    for (let x = from + 1.5; x < to; x += 3) {
      // (none behind the painting, nor behind the maker's plate beside it)
      if (turn === 0 && x > -PAINTING.width / 2 - 0.3) continue;
      on(new THREE.BoxGeometry(0.1, MUSICBOX_WALL_TOP - 0.9, 0.06).translate(x, MUSICBOX_WALL_TOP / 2, 0.03), WOOD_DARK);
    }
    on(new THREE.BoxGeometry(to - from, 0.09, 0.07).translate((from + to) / 2, 1.15, 0.035), WOOD_DARK);
    if (!RICH) continue;
    // under the top rail, a band of marquetry: lozenges of boxwood and ebony let into the wood, between two fine lines
    for (const edge of [-1, 1]) on(new THREE.PlaneGeometry(to - from, 0.03).translate((from + to) / 2, MUSICBOX_WALL_TOP - 0.62 + edge * 0.19, 0.006), EBONY);
    let k = 0;
    for (let x = from + 0.4; x < to - 0.2; x += 0.5, k++) {
      // the back wall's band breaks for the painting
      if (turn === 0 && x > -PAINTING.width / 2 - 0.5) continue;
      on(new THREE.PlaneGeometry(0.19, 0.19).rotateZ(Math.PI / 4).translate(x, MUSICBOX_WALL_TOP - 0.62, 0.008), k % 2 === 0 ? BOXWOOD : EBONY);
    }
  }
  // the painting's frame: ebony, with a boxwood slip inside it
  const frame = (grow: number, deep: number, color: string) => {
    for (const side of [-1, 1]) {
      parts.push(paint(new THREE.BoxGeometry(PAINTING.width + grow * 2, grow, deep).translate(0, PAINTING.y + side * (PAINTING.height / 2 + grow / 2), WALL_BACK + deep / 2), color));
      parts.push(paint(new THREE.BoxGeometry(grow, PAINTING.height, deep).translate(side * (PAINTING.width / 2 + grow / 2), PAINTING.y, WALL_BACK + deep / 2), color));
    }
  };
  frame(0.2, 0.12, EBONY);
  frame(0.06, 0.15, BOXWOOD);

  // the lid, propped open a crack over the back wall: its edge closes the gap the light comes through
  parts.push(paint(new THREE.BoxGeometry(width, 0.7, WALL_THICK + 0.5).translate(0, MUSICBOX_WALL_TOP + 1.1, WALL_BACK - WALL_THICK / 2 - 0.1), WOOD_DARK));

  // the ballerina's pedestal: turned wood
  parts.push(
    paint(
      lathe(
        [
          [BALLERINA.r, 0],
          [BALLERINA.r, 0.12],
          [BALLERINA.r * 0.92, 0.18],
          [BALLERINA.r * 0.7, 0.3],
          [BALLERINA.r * 0.6, 0.42],
          [BALLERINA.r * 0.62, BALLERINA.top - 0.24],
          [BALLERINA.r * 0.8, BALLERINA.top - 0.16],
          [BALLERINA.r * 0.9, BALLERINA.top - 0.1],
          [BALLERINA.r * 0.9, BALLERINA.top],
          [0, BALLERINA.top],
        ],
        24,
      ).translate(BALLERINA.x, 0, BALLERINA.z),
      WOOD_PALE,
    ),
  );
  return mergeParts(parts);
}

function Shell({ materials }: { materials: Materials }) {
  const velvet = useBuilt(velvetGeometry);
  const wood = useBuilt(woodGeometry);
  return (
    <>
      <mesh geometry={velvet} material={materials.velvet} receiveShadow />
      <mesh geometry={wood} material={materials.wood} receiveShadow />
    </>
  );
}

/** A screw, head up: domed, with its slot (turned a little differently each) */
function screw(x: number, y: number, z: number, r: number, seed: number) {
  return [
    metal(new THREE.SphereGeometry(r, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(x, y, z), BRASS),
    metal(new THREE.BoxGeometry(r * 1.7, 0.02, r * 0.22).rotateY(hash(seed, 31) * Math.PI).translate(x, y + r * 0.45, z), BRASS_SHADOW),
  ];
}

/** The brass that never moves: the comb's bedplate with its screws and note names, the cylinder's bearings, studs in the velvet, fittings on the walls */
function brassGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  // the comb's base: one bar per tooth, reaching back to that tooth's root (low notes long, high notes short)
  const pitch = TEETH[1].x - TEETH[0].x;
  TEETH.forEach((tooth, i) => {
    const back = tooth.rootZ - 0.4;
    const depth = COMB_BASE.frontZ - back;
    parts.push(metal(new THREE.BoxGeometry(pitch, COMB_BASE.top, depth).translate(tooth.x, COMB_BASE.top / 2, back + depth / 2), BRASS_DARK));
    // a scribed line where bar meets bar
    parts.push(metal(new THREE.PlaneGeometry(0.03, depth).rotateX(-Math.PI / 2).translate(tooth.x - pitch / 2, COMB_BASE.top + 0.002, back + depth / 2), BRASS_SHADOW));
    // the screw that holds the tooth down
    parts.push(...screw(tooth.x, TOOTH_TOP, tooth.rootZ - 0.45, 0.22, i));
    // and, engraved in front of it, the note it sings
    parts.push(
      paint(mapTo(new THREE.PlaneGeometry(0.7, 0.7), ENGRAVED.note(i)).rotateX(-Math.PI / 2).translate(tooth.x, COMB_BASE.top + 0.003, COMB_BASE.frontZ - 0.48), BRASS_DARK),
    );
  });
  // the bedplate's bevelled front edge
  const combWidth = pitch * TEETH.length;
  parts.push(metal(new THREE.BoxGeometry(combWidth + 0.1, 0.07, 0.1).translate(0, COMB_BASE.top - 0.035, COMB_BASE.frontZ + 0.03), BRASS));

  // a pillow block at each end of the cylinder: a foot bolted down, a body, and a round cap over the axle
  for (const side of [-1, 1]) {
    const x = side * (CYLINDER.halfLength + 0.9);
    parts.push(metal(new THREE.BoxGeometry(1.5, 0.22, 2.8).translate(x, 0.11, CYLINDER.z), BRASS_DARK));
    parts.push(metal(new THREE.BoxGeometry(1.1, CYLINDER.y - 0.2, 1.9).translate(x, 0.2 + (CYLINDER.y - 0.2) / 2, CYLINDER.z), BRASS_DARK));
    parts.push(metal(new THREE.CylinderGeometry(0.95, 0.95, 1.1, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(x, CYLINDER.y, CYLINDER.z), BRASS_DARK));
    parts.push(metal(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 14).rotateZ(Math.PI / 2).translate(x, CYLINDER.y, CYLINDER.z), BRASS));
    for (const end of [-1, 1]) parts.push(...screw(x, 0.22, CYLINDER.z + end * 1.15, 0.16, side * 3 + end));
  }
  // the fly: the little fan that keeps the tune from running away, in its bracket by the west bearing
  const fly = FLY;
  for (const end of [-1, 1]) parts.push(metal(new THREE.BoxGeometry(0.16, fly.top, 0.16).translate(fly.x, fly.top / 2, fly.z + end * 0.62), BRASS_DARK));
  parts.push(metal(new THREE.BoxGeometry(0.2, 0.14, 1.4).translate(fly.x, fly.top, fly.z), BRASS));

  // upholstery studs pinning the velvet in a diamond pattern (fewer on the lowest tier: only the nearer rows)
  let row = 0;
  for (let z = STUDS.z0; z < FLOOR_FRONT - 1; z += STUDS.stepZ, row++) {
    for (let x = STUDS.x0 + (row % 2) * (STUDS.stepX / 2); x < MUSICBOX_BOUNDS.x; x += STUDS.stepX) {
      // not under the comb, the cylinder or the pedestal
      if (z < COMB_BASE.frontZ + 0.6 && Math.abs(x) < TEETH[TEETH.length - 1].x + 1.4) continue;
      if (z < CYLINDER.z + CYLINDER.r + 0.4) continue;
      if (Math.hypot(x - BALLERINA.x, z - BALLERINA.z) < BALLERINA.r + 0.4) continue;
      if (!RICH && z > MUSICBOX_BOUNDS.zMax) continue;
      parts.push(metal(new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(x, 0, z), BRASS));
    }
  }

  // a brass band round the pedestal's waist
  parts.push(metal(new THREE.CylinderGeometry(BALLERINA.r * 0.64, BALLERINA.r * 0.64, 0.07, 24, 1, true).translate(BALLERINA.x, 0.5, BALLERINA.z), BRASS));

  // the maker's plate, screwed to the back wall beside the painting
  const plate = { width: 3.6, height: 1.2, x: PAINTING.width / 2 + 2.9, y: PAINTING.y - 0.15 };
  parts.push(paint(mapTo(new THREE.PlaneGeometry(plate.width, plate.height), ENGRAVED.plate).translate(plate.x, plate.y, WALL_BACK + 0.105), BRASS));
  parts.push(metal(new THREE.BoxGeometry(plate.width + 0.1, plate.height + 0.1, 0.1).translate(plate.x, plate.y, WALL_BACK + 0.05), BRASS_DARK));
  for (const [sx, sy] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    for (const piece of screw(sx * (plate.width / 2 - 0.16), 0, -sy * (plate.height / 2 - 0.16), 0.07, 60 + sx + sy * 2)) {
      parts.push(piece.rotateX(Math.PI / 2).translate(plate.x, plate.y, WALL_BACK + 0.105));
    }
  }

  // the winding key's escutcheon on the east wall: a round plate, four screws
  const onEastWall = (g: THREE.BufferGeometry) => g.rotateZ(Math.PI / 2).translate(WALL_X, WINDING_KEY.y, WINDING_KEY.z);
  parts.push(metal(onEastWall(new THREE.CylinderGeometry(0.95, 1.0, 0.1, 24).translate(0, 0.05, 0)), BRASS_DARK));
  parts.push(metal(onEastWall(new THREE.TorusGeometry(0.82, 0.035, 6, 24).rotateX(Math.PI / 2).translate(0, 0.11, 0)), BRASS));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    for (const piece of screw(Math.cos(a) * 0.68, 0.1, Math.sin(a) * 0.68, 0.09, 40 + k)) parts.push(onEastWall(piece));
  }

  if (RICH) {
    // brass corners on the wall tops, where the back wall meets the sides
    for (const side of [-1, 1]) {
      const x = side * (WALL_X + WALL_THICK / 2);
      const z = WALL_BACK - WALL_THICK / 2;
      const y = MUSICBOX_WALL_TOP + 0.05;
      parts.push(metal(new THREE.BoxGeometry(WALL_THICK + 0.2, 0.05, WALL_THICK + 0.2).translate(x, y, z), BRASS));
      parts.push(metal(new THREE.BoxGeometry(2.2, 0.05, WALL_THICK + 0.2).translate(x - side * 1.6, y, z), BRASS));
      parts.push(metal(new THREE.BoxGeometry(WALL_THICK + 0.2, 0.05, 2.2).translate(x, y, z + 1.6), BRASS));
      parts.push(...screw(x - side * 2.2, y + 0.02, z, 0.12, 50 + side), ...screw(x, y + 0.02, z + 2.2, 0.12, 52 + side));
    }
    // things that have slipped down past the tray and lie on the velvet at the front, out of reach: a gold ring, a thimble, a pin
    const front = MUSICBOX_BOUNDS.zMax;
    parts.push(metal(new THREE.TorusGeometry(0.62, 0.11, 8, 28).rotateX(Math.PI / 2 - 0.16).translate(-4.6, 0.16, front + 2.6), BRASS));
    parts.push(metal(new THREE.CylinderGeometry(0.2, 0.26, 0.2, 6).rotateX(-0.16).translate(-4.6, 0.3, front + 2.0), BRASS));
    parts.push(
      metal(
        lathe(
          [
            [0.5, 0],
            [0.52, 0.06],
            [0.46, 0.1],
            [0.4, 0.7],
            [0.3, 0.86],
            [0, 0.92],
          ],
          16,
        ).translate(6.2, 0, front + 3.1),
        STEEL,
      ),
    );
    parts.push(metal(new THREE.CylinderGeometry(0.035, 0.012, 3.4, 6).rotateZ(Math.PI / 2).rotateY(0.5).translate(1.6, 0.05, front + 3.4), STEEL));
  }
  return mergeParts(parts);
}

/** Pearls and a button among the things at the front: glazed like the ballerina, so they share her material */
function trinketGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const front = MUSICBOX_BOUNDS.zMax;
  // a broken string of pearls, lying in a loose curve
  for (let i = 0; i < 19; i++) {
    const t = i / 18;
    const x = -9.5 + t * 7 + Math.sin(t * 5) * 0.3;
    const z = front + 1.5 + Math.sin(t * Math.PI * 1.4) * 1.3 + t * 0.8;
    parts.push(paint(new THREE.SphereGeometry(0.2, 10, 8).translate(x, 0.19, z), PEARL));
  }
  // the pin's pearl head, and the stone in the ring
  parts.push(paint(new THREE.SphereGeometry(0.17, 10, 8).translate(1.6 - Math.cos(0.5) * 1.7, 0.16, front + 3.4 + Math.sin(0.5) * 1.7), PEARL));
  parts.push(paint(new THREE.OctahedronGeometry(0.2).scale(1, 0.8, 1).rotateX(-0.16).translate(-4.6, 0.45, front + 1.98), "#c83a5a"));
  // a mother-of-pearl button, four holes
  parts.push(paint(new THREE.CylinderGeometry(0.72, 0.76, 0.1, 22).translate(9.3, 0.05, front + 2.2), PEARL));
  parts.push(paint(new THREE.TorusGeometry(0.6, 0.06, 6, 22).rotateX(Math.PI / 2).translate(9.3, 0.1, front + 2.2), "#e6dccb"));
  for (const [dx, dz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    parts.push(paint(new THREE.CircleGeometry(0.07, 8).rotateX(-Math.PI / 2).translate(9.3 + dx * 0.16, 0.105, front + 2.2 + dz * 0.16), "#5a1626"));
  }
  return mergeParts(parts);
}

function Brass({ materials }: { materials: Materials }) {
  const geometry = useBuilt(brassGeometry);
  const trinkets = useBuilt(trinketGeometry);
  return (
    <>
      <mesh geometry={geometry} material={materials.metal} castShadow receiveShadow />
      {RICH ? <mesh geometry={trinkets} material={materials.porcelain} castShadow /> : null}
    </>
  );
}

// --- the comb -------------------------------------------------------------------

/** A struck tooth quivers this long; one plucked by a pin, more briefly */
const QUIVER_SECONDS = 0.7;
const PLUCK_SECONDS = 0.32;
/** When the tune comes back, a shiver runs along the comb from the low teeth to the high: this long between teeth, each quivering this long */
const RIPPLE = { step: 0.085, seconds: 0.8 };

/** Lay tooth i down in the instanced mesh, bent by `bend` radians at its root */
function placeTooth(m: THREE.InstancedMesh, dummy: THREE.Object3D, i: number, bend: number) {
  const tooth = TEETH[i];
  dummy.position.set(tooth.x, TOOTH_TOP - 0.1, tooth.rootZ);
  dummy.rotation.set(bend, 0, 0);
  dummy.scale.set(TOOTH_WIDTH, 0.2, tooth.rootZ - tooth.tipZ);
  dummy.updateMatrix();
  m.setMatrixAt(i, dummy.matrix);
}

/** A quiver dying away: `since` seconds into one lasting `seconds` (0 before and after) */
const quiver = (since: number, seconds: number, size: number) => (since > 0 && since < seconds ? Math.sin(since * 46) * size * (1 - since / seconds) : 0);

/**
 * The steel teeth: one instanced mesh. Each is hinged at its root (the unit
 * box reaches from z = 0 back to z = −1), so a struck tooth quivers about the
 * screw that holds it; and the next tooth of the tune wears a glowing plate.
 */
function Comb({ materials }: { materials: Materials }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const plate = useRef<THREE.Mesh>(null);
  const hinge = useBuilt(() => new THREE.BoxGeometry(1, 1, 1).translate(0, 0, -0.5));
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
      for (let i = 0; i < TOOTH_TAGS.length; i++) {
        // stepped on; shivering as the tune comes back; plucked by a pin as it plays
        const bend =
          quiver(sinceHit(TOOTH_TAGS[i], now), QUIVER_SECONDS, 0.035) +
          quiver(now - musicBoxRuntime.doneAt - i * RIPPLE.step, RIPPLE.seconds, 0.05) +
          quiver(now - pluckedAt[i], PLUCK_SECONDS, 0.022);
        const ringing = bend !== 0;
        if (!ringing && !scratch.current.moving) continue;
        moving ||= ringing;
        placeTooth(m, scratch.current.dummy, i, bend);
        m.instanceMatrix.needsUpdate = true;
      }
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
      <instancedMesh ref={mesh} args={[hinge, materials.steel, TEETH.length]} castShadow receiveShadow />
      <mesh ref={plate} material={glow} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  );
}

// --- the cylinder ---------------------------------------------------------------

/** The great wheel on the cylinder's east end, and the worm on its west end that drives the fly */
const WHEEL = { x: CYLINDER.halfLength + 1.95, r: 1.22, teeth: 22 };
const WORM_X = -(CYLINDER.halfLength + 1.9);
const FLY = { x: WORM_X, z: CYLINDER.z, top: CYLINDER.y + 1.75 };
/**
 * How far round from pointing straight up a pin is as it passes the teeth's
 * tips (which lie in front of the cylinder and below its axle).
 */
const PLUCK_ANGLE = Math.atan2(TEETH[0].tipZ - CYLINDER.z, TOOTH_TOP - CYLINDER.y);

/** The cylinder with its pins, lying along x (origin: its axis) */
function cylinderGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const along = (g: THREE.BufferGeometry) => g.rotateZ(Math.PI / 2);
  parts.push(metal(along(new THREE.CylinderGeometry(CYLINDER.r, CYLINDER.r, CYLINDER.halfLength * 2, 32, 1, true)), BRASS));
  // a fine line scribed round it between each tooth's track of pins
  const pitch = TEETH[1].x - TEETH[0].x;
  for (let i = 0; i <= TEETH.length; i++) {
    parts.push(metal(along(new THREE.CylinderGeometry(CYLINDER.r + 0.004, CYLINDER.r + 0.004, 0.035, 32, 1, true)).translate(TEETH[0].x - pitch / 2 + i * pitch, 0, 0), BRASS_DARK));
  }
  for (const side of [-1, 1]) {
    // a rim and a dished cap at each end, and the axle
    parts.push(metal(along(new THREE.CylinderGeometry(CYLINDER.r + 0.12, CYLINDER.r + 0.12, 0.3, 32)).translate(side * CYLINDER.halfLength, 0, 0), BRASS_DARK));
    parts.push(metal(along(new THREE.CylinderGeometry(CYLINDER.r * 0.55, CYLINDER.r * 0.55, 0.36, 20)).translate(side * CYLINDER.halfLength, 0, 0), BRASS));
    parts.push(metal(along(new THREE.CylinderGeometry(0.3, 0.3, 2.6, 10)).translate(side * (CYLINDER.halfLength + 1.2), 0, 0), STEEL));
  }
  // the great wheel: a toothed rim on five spokes
  parts.push(metal(along(new THREE.TorusGeometry(WHEEL.r - 0.1, 0.13, 6, 32).rotateX(Math.PI / 2)).translate(WHEEL.x, 0, 0), BRASS));
  parts.push(metal(along(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12)).translate(WHEEL.x, 0, 0), BRASS_DARK));
  for (let k = 0; k < 5; k++) {
    parts.push(metal(new THREE.BoxGeometry(0.14, WHEEL.r - 0.15, 0.2).translate(0, (WHEEL.r - 0.15) / 2 + 0.1, 0).rotateX((k / 5) * Math.PI * 2).translate(WHEEL.x, 0, 0), BRASS_DARK));
  }
  for (let k = 0; k < WHEEL.teeth; k++) {
    parts.push(metal(new THREE.BoxGeometry(0.2, 0.2, 0.17).translate(0, WHEEL.r + 0.07, 0).rotateX((k / WHEEL.teeth) * Math.PI * 2).translate(WHEEL.x, 0, 0), BRASS));
  }
  // the worm: a few turns of thread
  for (let k = -2; k <= 2; k++) {
    parts.push(metal(along(new THREE.TorusGeometry(0.36, 0.07, 5, 14).rotateX(Math.PI / 2)).rotateZ(0.12).translate(WORM_X + k * 0.2, 0, 0), BRASS));
  }
  const pin = (x: number, angle: number, color: string) => {
    // a pin stands out of the surface; angle 0 is the one facing the comb's tips at rest
    const g = new THREE.CylinderGeometry(0.07, 0.09, 0.42, 6).translate(0, CYLINDER.r + 0.16, 0).rotateX(Math.PI / 2 - angle);
    parts.push(metal(g.translate(x, 0, 0), color));
  };
  // the tune's own pins, bright…
  CYLINDER_PINS.forEach((p) => pin(p.x, p.angle, STEEL));
  // …among the many of the tune's other voices (a real cylinder is thick with them)
  const extras = byTier(44, 44, 16);
  for (let i = 0; i < extras; i++) {
    const tooth = TEETH[Math.floor(hash(i, 3) * TEETH.length)];
    pin(tooth.x + (hash(i, 4) - 0.5) * 0.9, hash(i, 5) * Math.PI * 2, BRASS_DARK);
  }
  return mergeParts(parts);
}

/** The fly: a spindle with two vanes, spun fast by the worm (origin: the foot of its spindle) */
function flyGeometry() {
  const parts: THREE.BufferGeometry[] = [metal(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6).translate(0, 0.75, 0), STEEL)];
  parts.push(metal(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 10).translate(0, 0.12, 0), BRASS));
  for (const side of [-1, 1]) parts.push(metal(new THREE.BoxGeometry(0.5, 0.42, 0.03).translate(side * 0.3, 1.1, 0), BRASS));
  return mergeParts(parts);
}

function Cylinder({ materials }: { materials: Materials }) {
  const drum = useRef<THREE.Mesh>(null);
  const fly = useRef<THREE.Mesh>(null);
  const geometry = useBuilt(cylinderGeometry);
  const flyShape = useBuilt(flyGeometry);
  useFrame(({ clock }, dt) => {
    if (!drum.current) return;
    const now = clock.getElapsedTime();
    const life = alive(now);
    const speed = THREE.MathUtils.lerp(CYLINDER_IDLE, CYLINDER_PLAYING, life);
    // turning so the pins on the comb's side rise past the teeth's tips
    const from = drum.current.rotation.x;
    const to = from - speed * dt;
    drum.current.rotation.x = to;
    if (fly.current) fly.current.rotation.y += speed * 14 * dt;
    if (life <= 0) return;
    // playing: each of the tune's pins plucks its tooth as it comes up past the tip
    CYLINDER_PINS.forEach((pin, i) => {
      const turn = (rotation: number) => Math.floor((Math.PI / 2 - pin.angle + rotation - PLUCK_ANGLE) / (Math.PI * 2));
      if (turn(from) !== turn(to)) pluckedAt[TUNE[i][0]] = now;
    });
  });
  return (
    <>
      <mesh ref={drum} geometry={geometry} material={materials.metal} position={[0, CYLINDER.y, CYLINDER.z]} castShadow />
      <mesh ref={fly} geometry={flyShape} material={materials.metal} position={[FLY.x, CYLINDER.y + 0.3, FLY.z]} />
    </>
  );
}

// --- the ballerina --------------------------------------------------------------

/** A stiff net skirt: a shallow cone whose hem ripples */
function skirt(top: number, hem: number, drop: number, y: number, color: string) {
  const g = new THREE.CylinderGeometry(top, hem, drop, 28, 1, true);
  const position = g.attributes.position;
  for (let i = 0; i < position.count; i++) {
    if (position.getY(i) > 0) continue;
    const ruffle = Math.sin(Math.atan2(position.getZ(i), position.getX(i)) * 9);
    position.setXYZ(i, position.getX(i) * (1 + ruffle * 0.05), position.getY(i) + ruffle * 0.035, position.getZ(i) * (1 + ruffle * 0.05));
  }
  g.computeVertexNormals();
  return paint(g.translate(0, y, 0), color);
}

/** The figurine on her turntable (origin: the middle of the pedestal's top), arms raised in a ring, on one toe; she faces +z */
function ballerinaGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  // her turntable: gilt, with a beaded edge
  parts.push(paint(new THREE.CylinderGeometry(0.75, 0.8, 0.12, 24).translate(0, 0.06, 0), BRASS));
  parts.push(paint(new THREE.TorusGeometry(0.76, 0.035, 5, 24).rotateX(Math.PI / 2).translate(0, 0.12, 0), "#f0cc78"));
  // the standing leg, on pointe in a pink slipper; the other drawn up, toe to knee
  parts.push(paint(new THREE.CylinderGeometry(0.075, 0.05, 1.05, 8).translate(0.02, 0.75, 0), SKIN));
  parts.push(paint(new THREE.CylinderGeometry(0.058, 0.02, 0.2, 8).translate(0.02, 0.2, 0), TUTU_DEEP));
  parts.push(paint(new THREE.CylinderGeometry(0.07, 0.06, 0.62, 8).rotateZ(-0.95).translate(0.3, 1.12, 0), SKIN));
  parts.push(paint(new THREE.CylinderGeometry(0.06, 0.045, 0.6, 8).rotateZ(0.75).translate(0.33, 0.78, 0), SKIN));
  parts.push(paint(new THREE.SphereGeometry(0.055, 8, 6).scale(1, 1.5, 1).rotateZ(0.75).translate(0.12, 0.55, 0), TUTU_DEEP));
  // the tutu: three stiff layers, each hem ruffled
  parts.push(skirt(0.2, 1.0, 0.14, 1.33, "#f8cdd9"));
  parts.push(skirt(0.21, 0.88, 0.14, 1.4, TUTU));
  parts.push(skirt(0.2, 0.68, 0.13, 1.48, TUTU_DEEP));
  // bodice with a gilt waist, neck, head
  parts.push(paint(new THREE.CylinderGeometry(0.2, 0.15, 0.6, 12).translate(0, 1.8, 0), TUTU_DEEP));
  parts.push(paint(new THREE.TorusGeometry(0.16, 0.025, 5, 14).rotateX(Math.PI / 2).translate(0, 1.56, 0), "#f0cc78"));
  parts.push(paint(new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, Math.PI / 2 - 0.2, 0.5).translate(0, 2.06, 0), SKIN));
  parts.push(paint(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 8).translate(0, 2.16, 0), SKIN));
  parts.push(paint(new THREE.SphereGeometry(0.21, 14, 12).translate(0, 2.4, 0), SKIN));
  // a painted face: two dark eyes, a blush on each cheek
  for (const side of [-1, 1]) {
    parts.push(paint(new THREE.SphereGeometry(0.024, 6, 5).translate(side * 0.075, 2.42, 0.195), "#3a2a22"));
    parts.push(paint(new THREE.SphereGeometry(0.04, 6, 5).scale(1, 0.7, 0.3).translate(side * 0.125, 2.36, 0.17), "#f2a7b4"));
  }
  // hair drawn back into a bun, and a little crown before it
  parts.push(paint(new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(-0.35).translate(0, 2.42, -0.01), HAIR));
  parts.push(paint(new THREE.SphereGeometry(0.1, 8, 6).translate(0, 2.64, -0.1), HAIR));
  parts.push(paint(new THREE.TorusGeometry(0.075, 0.02, 4, 10).rotateX(Math.PI / 2 - 0.3).translate(0, 2.61, 0.04), "#f0cc78"));
  // arms: a ring held over the head
  parts.push(paint(new THREE.TorusGeometry(0.42, 0.05, 6, 18, Math.PI * 1.55).rotateZ(-Math.PI * 0.275).translate(0, 2.42, 0), SKIN));
  return mergeParts(parts);
}

function Ballerina({ materials }: { materials: Materials }) {
  const figure = useRef<THREE.Mesh>(null);
  const geometry = useBuilt(ballerinaGeometry);
  useFrame(({ clock }, dt) => {
    const f = figure.current;
    if (!f) return;
    const now = clock.getElapsedTime();
    const life = alive(now);
    f.rotation.y += THREE.MathUtils.lerp(BALLERINA_IDLE, BALLERINA_DANCING, life) * dt;
    // dancing: she rises and dips and sways as she spins
    f.position.y = BALLERINA.top + 0.04 + life * (0.12 + Math.abs(Math.sin(now * 3.3)) * 0.22);
    f.rotation.z = life * Math.sin(now * 1.65) * 0.14;
  });
  return <mesh ref={figure} geometry={geometry} material={materials.porcelain} position={[BALLERINA.x, BALLERINA.top + 0.04, BALLERINA.z]} scale={1.25} castShadow />;
}

// --- the winding key ------------------------------------------------------------

/** The key through the east wall: a shaft with a knurled collar and a butterfly grip (origin: where the shaft leaves the wall; it points −x, into the box) */
function keyGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(metal(new THREE.CylinderGeometry(0.16, 0.16, 1.5, 10).rotateZ(Math.PI / 2).translate(-0.75, 0, 0), BRASS_DARK));
  parts.push(metal(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 14).rotateZ(Math.PI / 2).translate(-0.12, 0, 0), BRASS));
  // the collar is knurled: a ring of little ridges
  for (let k = 0; k < 12; k++) {
    parts.push(metal(new THREE.BoxGeometry(0.3, 0.06, 0.06).translate(-0.5, 0.27, 0).rotateX((k / 12) * Math.PI * 2), BRASS));
  }
  parts.push(metal(new THREE.CylinderGeometry(0.24, 0.24, 0.3, 12).rotateZ(Math.PI / 2).translate(-0.5, 0, 0), BRASS_DARK));
  // the grip: two flat bows, pierced
  for (const side of [-1, 1]) {
    parts.push(metal(new THREE.TorusGeometry(0.62, 0.15, 8, 20).scale(1, 1, 0.55).rotateY(Math.PI / 2).translate(-1.5, side * 0.72, 0), BRASS));
    parts.push(metal(new THREE.SphereGeometry(0.11, 8, 6).translate(-1.5, side * 1.42, 0), BRASS_DARK));
  }
  parts.push(metal(new THREE.SphereGeometry(0.26, 10, 8).translate(-1.5, 0, 0), BRASS_DARK));
  return mergeParts(parts);
}

function WindingKey({ materials }: { materials: Materials }) {
  const key = useRef<THREE.Mesh>(null);
  const geometry = useBuilt(keyGeometry);
  useFrame(({ clock }) => {
    if (!key.current) return;
    const now = clock.getElapsedTime();
    // it unwinds in ticks, as a spring lets go; quicker while the box plays
    const rate = THREE.MathUtils.lerp(0.5, 2.2, alive(now));
    const turns = now * rate;
    key.current.rotation.x = (Math.floor(turns) + THREE.MathUtils.smoothstep(turns % 1, 0, 0.35)) * (Math.PI / 4);
  });
  return <mesh ref={key} geometry={geometry} material={materials.metal} position={[WALL_X, WINDING_KEY.y, WINDING_KEY.z]} castShadow />;
}

// --- sparks ---------------------------------------------------------------------

/** Sparks of light: a spray off every tooth the moment the tune comes back, then one off each tooth a pin plucks, and a drift round the dancer */
const SPARKS = byTier(48, 32, 16);
const SPARK_SECONDS = 1.5;
/** A spark is flat: it leans back to face the room's camera, which looks down from the south */
const SPARK_TILT = -Math.atan2(REGIONS.musicbox.camera[1], REGIONS.musicbox.camera[2]);

/** A four-pointed glint, about one unit across, facing +z */
function glintGeometry() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.11;
    const a = (i / 8) * Math.PI * 2;
    if (i === 0) shape.moveTo(Math.sin(a) * r, Math.cos(a) * r);
    else shape.lineTo(Math.sin(a) * r, Math.cos(a) * r);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function Sparks({ materials }: { materials: Materials }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const glint = useBuilt(glintGeometry);
  const state = useRef({
    dummy: new THREE.Object3D(),
    /** each spark: when it was struck, where, and which way it flies */
    born: new Float32Array(SPARKS).fill(-Infinity),
    from: new Float32Array(SPARKS * 3),
    fly: new Float32Array(SPARKS * 3),
    next: 0,
    /** what has already been answered with sparks */
    seenDone: Infinity,
    seenPluck: TEETH.map(() => -Infinity),
    dancerAt: 0,
  });

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const now = clock.getElapsedTime();
    const st = state.current;
    const strike = (x: number, y: number, z: number, vx: number, vy: number, vz: number) => {
      const i = st.next;
      st.next = (st.next + 1) % SPARKS;
      st.born[i] = now;
      st.from.set([x, y, z], i * 3);
      st.fly.set([vx, vy, vz], i * 3);
    };
    const { doneAt } = musicBoxRuntime;
    if (doneAt === Infinity) st.seenDone = Infinity;
    else if (st.seenDone !== doneAt) {
      // the tune is whole again: every tooth throws sparks, low notes to high
      st.seenDone = doneAt;
      const each = Math.max(1, Math.floor(SPARKS / TEETH.length) - 1);
      TEETH.forEach((tooth, t) => {
        for (let k = 0; k < each; k++) {
          const seed = t * 7 + k;
          strike(tooth.x + (hash(seed, 41) - 0.5) * 1.1, TOOTH_TOP + 0.1, THREE.MathUtils.lerp(tooth.tipZ, tooth.rootZ, hash(seed, 42)), (hash(seed, 43) - 0.5) * 1.6, 2.2 + hash(seed, 44) * 2.2, (hash(seed, 45) - 0.5) * 1.2);
        }
      });
    }
    TEETH.forEach((tooth, t) => {
      if (pluckedAt[t] === st.seenPluck[t]) return;
      st.seenPluck[t] = pluckedAt[t];
      // a pin has just plucked this tooth: a spark off its tip
      if (now - pluckedAt[t] < 0.2) strike(tooth.x + (hash(now, t) - 0.5) * 0.6, TOOTH_TOP + 0.15, tooth.tipZ + 0.3, (hash(now, t + 9) - 0.5) * 0.8, 1.6 + hash(now, t + 5), 0.5);
    });
    if (alive(now) > 0 && now - st.dancerAt > 0.3) {
      st.dancerAt = now;
      const a = hash(now, 51) * Math.PI * 2;
      strike(BALLERINA.x + Math.cos(a) * 1.1, BALLERINA.top + 1.6 + hash(now, 52) * 1.6, BALLERINA.z + Math.sin(a) * 1.1, Math.cos(a) * 0.5, 0.5, Math.sin(a) * 0.5);
    }

    let any = false;
    for (let i = 0; i < SPARKS; i++) {
      const age = (now - st.born[i]) / SPARK_SECONDS;
      const d = st.dummy;
      if (age >= 0 && age < 1) {
        any = true;
        const t = age * SPARK_SECONDS;
        // thrown up, slowing, drifting; it flares and dies, turning as it goes
        d.position.set(st.from[i * 3] + st.fly[i * 3] * t, st.from[i * 3 + 1] + st.fly[i * 3 + 1] * t * (1 - age * 0.45), st.from[i * 3 + 2] + st.fly[i * 3 + 2] * t);
        d.rotation.set(SPARK_TILT, 0, t * 3 + i);
        d.scale.setScalar(Math.max(0.001, Math.sin(age * Math.PI) ** 0.7 * (0.22 + hash(i, 46) * 0.26)));
      } else {
        d.position.set(0, -5, 0);
        d.scale.setScalar(0.001);
      }
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
    }
    m.visible = any;
    if (any) m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[glint, materials.spark, SPARKS]} visible={false} frustumCulled={false} />;
}

// --- light ----------------------------------------------------------------------

/** Shafts of light slanting down from the gap under the lid: this many */
const SHAFTS = quality.tier === "minimal" ? 3 : 6;
/** Dust hanging in the room, seen where the light catches it */
const DUST = byTier(110, 64, 24);
const DUST_ROOM = { x: WALL_X - 0.8, y: MUSICBOX_WALL_TOP + 1, z0: WALL_BACK + 0.6, z1: MUSICBOX_BOUNDS.zMax };

/** The lit gap along the top of the back wall, the shafts that fall from it, and the pool they make round the dancer (one additive mesh; colour is brightness) */
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
  // where the light lands: a soft pool on the velvet round the pedestal (bright in the middle, nothing at its edge)
  const pool = new THREE.CircleGeometry(4.2, 28).rotateX(-Math.PI / 2).translate(BALLERINA.x, 0.02, BALLERINA.z);
  const shade = new Float32Array(pool.attributes.position.count * 3);
  shade.fill(0.15, 0, 3);
  pool.setAttribute("color", new THREE.BufferAttribute(shade, 3));
  parts.push(pool);
  return mergeParts(parts);
}

function dustGeometry() {
  const g = new THREE.BufferGeometry();
  const positions = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    positions[i * 3] = (hash(i, 61) - 0.5) * 2 * DUST_ROOM.x;
    positions[i * 3 + 1] = hash(i, 62) * DUST_ROOM.y;
    positions[i * 3 + 2] = THREE.MathUtils.lerp(DUST_ROOM.z0, DUST_ROOM.z1, hash(i, 63));
  }
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return g;
}

/**
 * The room's light: a candle's warm, unsteady glow from the start; and the
 * daylight that pours in under the lid once the box plays again — the gap
 * brightens, shafts fall across the comb, the dust in the air turns to gold,
 * the painting on the back wall comes out of the gloom, and the whole room
 * lifts.
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
  const dustShape = useBuilt(dustGeometry);
  const dot = useBuilt(dotTexture);
  const painting = useBuilt(dreamPainting);
  const gap = useRef<THREE.Mesh>(null);
  const dust = useRef<THREE.Points>(null);
  const picture = useRef<THREE.Mesh>(null);
  const candle = useRef<THREE.PointLight>(null);
  const day = useRef<THREE.PointLight>(null);
  useFrame(({ clock }, rawDelta) => {
    const now = clock.getElapsedTime();
    const dt = Math.min(rawDelta, 0.05);
    const life = alive(now);
    // a sliver of light under the lid all along; all of it once the tune is whole
    if (gap.current) (gap.current.material as THREE.MeshBasicMaterial).opacity = 0.1 + life * (0.8 + Math.sin(now * 1.3) * 0.06);
    if (candle.current) candle.current.intensity = 55 * (1 + Math.sin(now * 9.1) * 0.05 + Math.sin(now * 14.7) * 0.03);
    if (day.current) day.current.intensity = life * 160;
    // by candlelight the painting is a dim shape on the wall; in daylight you see what it is
    if (picture.current) (picture.current.material as THREE.MeshBasicMaterial).color.setScalar(0.42 + life * 0.58);
    const d = dust.current;
    if (d) {
      // motes sink slowly and sidle on the air; faint by candlelight, bright in the lid's light
      const position = d.geometry.attributes.position;
      for (let i = 0; i < DUST; i++) {
        let y = position.getY(i) - dt * (0.05 + hash(i, 64) * 0.08);
        if (y < 0.1) y += DUST_ROOM.y;
        position.setXY(i, position.getX(i) + Math.sin(now * 0.4 + i) * dt * 0.06, y);
      }
      position.needsUpdate = true;
      (d.material as THREE.PointsMaterial).opacity = 0.16 + life * 0.6;
    }
  });
  return (
    <>
      <mesh ref={gap} geometry={geometry} material={glow} />
      <mesh ref={picture} position={[0, PAINTING.y, WALL_BACK + 0.04]}>
        <planeGeometry args={[PAINTING.width, PAINTING.height]} />
        <meshBasicMaterial map={painting} />
      </mesh>
      <points ref={dust} geometry={dustShape} frustumCulled={false}>
        <pointsMaterial map={dot} color={LID_LIGHT} size={0.16} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
      <pointLight ref={candle} color="#ffb76a" position={[-6.5, 4.2, 6]} intensity={55} distance={40} decay={1.7} />
      {/* mounted from the start at no brightness, so its arrival compiles nothing */}
      <pointLight ref={day} color={LID_LIGHT} position={[0, MUSICBOX_WALL_TOP + 2, WALL_BACK + 4]} intensity={0} distance={50} decay={1.5} />
    </>
  );
}
