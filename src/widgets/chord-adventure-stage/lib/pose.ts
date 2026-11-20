import {
  ADVENTURE_DEATH_MS,
  ADVENTURE_INTRO_MS,
  ADVENTURE_VICTORY_MS,
  STAGES_PER_SCENE,
  sceneFor,
  type AdventureClock,
  type AdventureView,
} from "@/entities/chord-adventure";
import { clamp01, easeIn, easeOut, lerp, lungeCurve, LUNGE_DISTANCE, missJolt } from "./motion";
import { GROUND_Y } from "./scenes";
import type { HeroFrame } from "./sprites";
import { burst, type StageFx } from "./stage-fx";

/** Where things stand (logical px). The monster closes in from FAR to NEAR as time runs out. */
export const HERO_X = 64;
export const MONSTER_FAR_X = 224;
export const MONSTER_NEAR_X = HERO_X + 24;
/** How far the world scrolls while walking to the next monster. */
const WALK_DISTANCE = 150;
/** How fast the monster closes the gap a miss costs (per second, exponential) */
const PENALTY_EASE = 7;
/** Victory beats (ms into the phase): notes fly until FIRE_END, then Kordi walks on from WALK_START */
const FIRE_END = 560;
const WALK_START = 900;

export const isBoss = (stage: number) => stage % STAGES_PER_SCENE === 0;

/** Everyone's position and look for one frame. */
export interface Pose {
  heroX: number;
  /** vertical bob, px (negative = up) */
  heroBob: number;
  heroFrame: HeroFrame;
  /** 0–1: Kordi tipping over at the end */
  heroFall: number;
  /** 0–1: how high the baton is raised */
  batonRaise: number;
  /** how hard Kordi was just hit (0–1): a red flash */
  hit: number;
  monsterX: number;
  monsterAlpha: number;
  /** the white frame the monster flashes as it's hit */
  monsterFlash: boolean;
  /** px the monster is off the ground (its idle hop plus a dash) */
  monsterLift: number;
  /** which animation frame (floored, then wrapped by frame count) */
  monsterFramePhase: number;
  /** 0–1: how close time is to running out */
  danger: number;
  /** random rumble, px */
  shake: number;
  /** deterministic sideways jolt (a miss), px */
  joltX: number;
  /** 0–1 progress of notes flying to the monster, or −1 */
  notes: number;
  /** 0–1: cross-fade to the next scene while walking on */
  sceneMix: number;
}

/**
 * Work out this frame's pose from the game phase and its clock, advancing the
 * stage's effects (scrolling, bursts, pop-up words, animation phases) by `dt`.
 */
export function posePlayers(view: AdventureView, clock: AdventureClock, fx: StageFx, now: number, dt: number): Pose {
  const elapsed = now - clock.phaseStartedAt;
  const time = now / 1000;
  const boss = isBoss(view.stage);
  // a new run starts clean (otherwise "already burst for stage 1" would carry over)
  if (view.phase === "ready" || view.phase === "intro") {
    fx.burstFor = -1;
    fx.pops.length = 0;
  }

  const pose: Pose = {
    heroX: HERO_X,
    heroBob: 0,
    heroFrame: Math.floor(time * 1.3) % 6 === 0 && time % 0.77 < 0.12 ? "blink" : "idle",
    heroFall: 0,
    batonRaise: 0,
    hit: 0,
    monsterX: MONSTER_FAR_X,
    monsterAlpha: 1,
    monsterFlash: false,
    monsterLift: 0,
    monsterFramePhase: 0,
    danger: 0,
    shake: 0,
    joltX: 0,
    notes: -1,
    sceneMix: 0,
  };
  const walking: HeroFrame = Math.floor(time * 9) % 2 === 0 ? "stepA" : "stepB";
  let dash = 0;

  switch (view.phase) {
    case "ready":
    case "loading":
      pose.monsterAlpha = 0;
      pose.heroBob = Math.round(Math.sin(time * 2.5));
      break;
    case "intro": {
      pose.heroX = lerp(-24, HERO_X, easeOut(clamp01(elapsed / ADVENTURE_INTRO_MS)));
      pose.heroFrame = walking;
      fx.scroll += dt * 50;
      pose.monsterAlpha = 0;
      break;
    }
    case "playing": {
      // a new monster starts with no penalty; afterwards the shown one catches up smoothly
      if (clock.penaltyMs < fx.shownPenalty) fx.shownPenalty = clock.penaltyMs;
      fx.shownPenalty += (clock.penaltyMs - fx.shownPenalty) * (1 - Math.exp(-dt * PENALTY_EASE));
      const danger = clamp01((elapsed + fx.shownPenalty) / clock.limitMs);
      pose.danger = danger;
      const sinceMiss = now - clock.lastMissAt;
      const lunge = lungeCurve(sinceMiss);
      if (clock.lastMissAt !== fx.missSeen && sinceMiss < 100) {
        fx.missSeen = clock.lastMissAt;
        fx.pops.push({ text: "MISS", color: "#ff5a5a", x: HERO_X - 4, y: 58, born: now });
      }
      pose.monsterX = lerp(MONSTER_FAR_X, MONSTER_NEAR_X + (boss ? 10 : 0), easeIn(danger)) - lunge * LUNGE_DISTANCE;
      dash = Math.round(lunge * 4);
      pose.monsterAlpha = clamp01(elapsed / 350);
      // Kordi takes the hit: knocked back a touch, flinching while it lasts
      pose.hit = lunge;
      pose.heroX -= Math.round(lunge * 3);
      fx.heroPhase += dt * (2.5 + danger * 7);
      pose.heroBob = lunge > 0 ? 0 : Math.round(Math.sin(fx.heroPhase));
      if (lunge > 0.15 || danger > 0.88) pose.heroFrame = "ouch";
      pose.batonRaise = 0.3;
      pose.joltX = missJolt(sinceMiss);
      // a low rumble as time runs out
      pose.shake = danger > 0.8 ? (danger - 0.8) * 8 * (Math.sin(time * 7) > 0.6 ? 1 : 0.3) : 0;
      break;
    }
    case "victory": {
      pose.monsterX = lerp(MONSTER_FAR_X, MONSTER_NEAR_X, 0.2);
      pose.batonRaise = elapsed < FIRE_END ? 1 : Math.max(0, 1 - (elapsed - FIRE_END) / 300);
      if (elapsed < FIRE_END) pose.notes = elapsed / FIRE_END;
      pose.monsterFlash = elapsed > FIRE_END - 90 && elapsed < FIRE_END + 120;
      pose.monsterAlpha = elapsed < FIRE_END + 120 ? 1 : 0;
      if (elapsed >= FIRE_END && fx.burstFor !== view.stage) {
        fx.burstFor = view.stage;
        fx.flash = 1;
        burst(fx.bits, pose.monsterX + (boss ? 24 : 12), GROUND_Y - (boss ? 24 : 12), view.scene, boss);
        const used = clock.lastAnswerUsed;
        const [text, color] = used < 0.34 ? ["PERFECT!", "#ffe066"] : used < 0.67 ? ["GREAT!", "#8fe3ff"] : ["GOOD", "#c9f2b0"];
        fx.pops.push({ text, color, x: pose.monsterX - 10, y: 48, born: now });
      }
      if (elapsed > WALK_START) {
        const p = clamp01((elapsed - WALK_START) / (ADVENTURE_VICTORY_MS - WALK_START));
        fx.scroll += dt * (WALK_DISTANCE / ((ADVENTURE_VICTORY_MS - WALK_START) / 1000));
        pose.heroFrame = walking;
        if (sceneFor(view.stage + 1) !== view.scene) pose.sceneMix = clamp01((p - 0.15) / 0.6);
      } else {
        pose.heroBob = -Math.round(Math.sin(clamp01(elapsed / FIRE_END) * Math.PI) * 5);
      }
      break;
    }
    case "dying":
    case "over": {
      const p = view.phase === "over" ? 1 : clamp01(elapsed / ADVENTURE_DEATH_MS);
      pose.danger = 1;
      pose.monsterX = MONSTER_NEAR_X + (boss ? 10 : 0) - Math.sin(clamp01(p * 3) * Math.PI) * 10;
      pose.heroFrame = "ouch";
      pose.heroFall = clamp01((p - 0.18) / 0.3);
      pose.heroX = HERO_X - pose.heroFall * 14;
      pose.shake = p < 0.35 ? 4 * (1 - p / 0.35) : 0;
      break;
    }
  }

  // the monster's idle hop and walk cycle quicken with danger (only while it's on screen)
  if (pose.monsterAlpha > 0) {
    fx.monsterFramePhase += dt * (6 + pose.danger * 10);
    fx.monsterHopPhase += dt * (3.5 + pose.danger * 9);
    const hop = Math.round(Math.abs(Math.sin(fx.monsterHopPhase)) * (2 + pose.danger * 2));
    pose.monsterLift = hop + dash;
    pose.monsterFramePhase = fx.monsterFramePhase;
  }
  return pose;
}
