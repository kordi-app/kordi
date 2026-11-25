import { describe, expect, it } from "vitest";
import { KEEP_OUT, PERCH_HEIGHT, PERCH_RADIUS, carryPetSwim, createPetSwim, stepPetSwim, type PetMood, type PetOwner } from "./pet-swim";

const DT = 1 / 60;
const SCALE = 1.6;

/** Runs `seconds` of frames, moving the owner with `drive` before each one; returns the clock */
function run(
  s: ReturnType<typeof createPetSwim>,
  owner: PetOwner,
  seconds: number,
  from = 0,
  drive: (owner: PetOwner, t: number) => void = () => {},
  mood: PetMood = "follow",
  each: () => void = () => {},
) {
  let t = from;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    t += DT;
    drive(owner, t);
    stepPetSwim(s, owner, mood, t, DT);
    each();
  }
  return t;
}

const fromOwner = (s: ReturnType<typeof createPetSwim>, owner: PetOwner) => Math.hypot(s.x - owner.x, s.z - owner.z);

describe("a pet swimming after its owner", () => {
  it("starts on its perch: beside and above the shoulder", () => {
    const owner = { x: 3, y: 1, z: -2, heading: 0.4, scale: SCALE };
    const s = createPetSwim();
    stepPetSwim(s, owner, "follow", 0, 0);
    expect(fromOwner(s, owner)).toBeCloseTo(PERCH_RADIUS * SCALE);
    expect(s.y - owner.y).toBeCloseTo(PERCH_HEIGHT * SCALE);
  });

  it("does not swing round when the owner turns on the spot", () => {
    const owner = { x: 0, y: 0, z: 0, heading: 0, scale: SCALE };
    const still = createPetSwim();
    const spun = createPetSwim();
    // both start from the same perch
    stepPetSwim(still, owner, "follow", 0, 0);
    stepPetSwim(spun, owner, "follow", 0, 0);
    run(still, { ...owner }, 3);
    // three full turns in three seconds
    run(spun, owner, 3, 0, (o, t) => {
      o.heading = t * Math.PI * 2;
    });
    expect(spun.x).toBeCloseTo(still.x, 6);
    expect(spun.y).toBeCloseTo(still.y, 6);
    expect(spun.z).toBeCloseTo(still.z, 6);
    expect(spun.yaw).toBeCloseTo(still.yaw, 6);
  });

  it("lags behind a walking owner, facing the way it swims, then settles by them again", () => {
    const owner = { x: 0, y: 0, z: 0, heading: 0, scale: SCALE };
    const s = createPetSwim();
    let t = run(s, owner, 1);
    // walking towards +x at Kordi's pace
    t = run(s, owner, 3, t, (o) => {
      o.x += 4.2 * DT;
    });
    expect(s.x).toBeLessThan(owner.x); // behind
    expect(owner.x - s.x).toBeLessThan(3 * SCALE); // but not left behind
    expect(Math.sin(s.yaw)).toBeGreaterThan(0.9); // nose towards +x
    run(s, owner, 4, t);
    expect(fromOwner(s, owner)).toBeGreaterThan(KEEP_OUT * SCALE - 1e-6);
    expect(fromOwner(s, owner)).toBeLessThan((PERCH_RADIUS + 0.4) * SCALE);
    expect(Math.hypot(s.vx, s.vz) / SCALE).toBeLessThan(0.5); // only its idle drift left
  });

  it("never passes through the owner, whichever way they walk", () => {
    for (const angle of [0, 1, 2, 3, 4, 5, 6]) {
      const owner = { x: 0, y: 0, z: 0, heading: 0, scale: SCALE };
      const s = createPetSwim();
      let closest = Infinity;
      const watch = () => {
        closest = Math.min(closest, fromOwner(s, owner));
      };
      // straight at where the pet floats, then back again
      let t = run(s, owner, 2, 0, (o) => ((o.x += Math.sin(angle) * 4.2 * DT), (o.z += Math.cos(angle) * 4.2 * DT)), "follow", watch);
      t = run(s, owner, 2, t, (o) => ((o.x -= Math.sin(angle) * 4.2 * DT), (o.z -= Math.cos(angle) * 4.2 * DT)), "follow", watch);
      expect(closest, `walking at ${angle} rad`).toBeGreaterThan(KEEP_OUT * SCALE - 1e-6);
    }
  });

  it("comes into the owner's arms when they sit, in front of them", () => {
    const owner = { x: 0, y: 0, z: 0, heading: 1.2, scale: SCALE };
    const s = createPetSwim();
    const t = run(s, owner, 1);
    run(s, owner, 4, t, undefined, "sit");
    expect(s.x).toBeCloseTo(Math.sin(1.2) * 0.62 * SCALE, 1);
    expect(s.z).toBeCloseTo(Math.cos(1.2) * 0.62 * SCALE, 1);
    expect(s.y).toBeLessThan(0.6 * SCALE);
  });

  it("is carried through a portal with its owner instead of swimming across the map", () => {
    const owner = { x: 0, y: 0, z: 0, heading: 0, scale: SCALE };
    const s = createPetSwim();
    const t = run(s, owner, 1);
    const offset = { x: s.x - owner.x, z: s.z - owner.z };
    owner.x = 80;
    owner.z = -40;
    carryPetSwim(s, owner.x, owner.y, owner.z, SCALE);
    expect(s.x - owner.x).toBeCloseTo(offset.x);
    expect(s.z - owner.z).toBeCloseTo(offset.z);
    // and an ordinary step is not a carry
    owner.x += 0.1;
    const before = s.x;
    carryPetSwim(s, owner.x, owner.y, owner.z, SCALE);
    expect(s.x).toBe(before);
    run(s, owner, 1, t);
    expect(fromOwner(s, owner)).toBeLessThan((PERCH_RADIUS + 0.4) * SCALE);
  });
});
