import { ADVENTURE_DEATH_MS, isBossStage, sceneFor, type AdventureView } from "@/entities/chord-adventure";
import { clamp01, easeIn, easeOut, lerp } from "./motion";
import type { Pose } from "./pose";
import { GROUND_Y, H, W, drawParticles, drawScene, glow, sceneAmbient, sceneDark } from "./scenes";
import { HERO_HEIGHT, batonSprite, heroSprite, monsterFrameCount, monsterSprite, noteSprite, scarfSprite } from "./sprites";
import type { StageFx } from "./stage-fx";

/** The light around Kordi: wide when calm, a small pool at the end. */
const LIGHT_CALM = 170;
const LIGHT_LAST = 34;
const SHADOW = "rgba(10, 6, 20, 0.35)";
const POP_MS = 900;

export interface FrameContext {
  ctx: CanvasRenderingContext2D;
  /** an offscreen canvas the darkness is composed on */
  light: HTMLCanvasElement;
  lightCtx: CanvasRenderingContext2D;
  view: AdventureView;
  pose: Pose;
  fx: StageFx;
  now: number;
  dt: number;
  /** ms since the current phase began */
  elapsed: number;
  fontFamily: string;
  reducedMotion: boolean;
}

/** Draw one frame of the stage, back to front. */
export function renderStage(f: FrameContext) {
  const { ctx, pose } = f;
  ctx.save();
  const shake = f.reducedMotion ? 0 : pose.shake;
  const jolt = f.reducedMotion ? 0 : pose.joltX;
  if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
  if (jolt !== 0) ctx.translate(Math.round(jolt), 0);

  drawBackdrop(f);
  drawMonster(f);
  const hero = drawHero(f);
  drawNotes(f, hero.width);
  drawBits(f);
  drawParticles(ctx, f.view.scene, f.fx.scroll, f.now / 1000);
  drawDarkness(f);
  drawPops(f);
  drawHitFlash(f);
  ctx.restore();
}

function drawBackdrop({ ctx, view, pose, fx, now }: FrameContext) {
  const time = now / 1000;
  drawScene(ctx, view.scene, fx.scroll, time);
  if (pose.sceneMix > 0) {
    ctx.globalAlpha = pose.sceneMix;
    drawScene(ctx, sceneFor(view.stage + 1), fx.scroll, time);
    ctx.globalAlpha = 1;
  }
}

/** The monster, facing Kordi (bosses at double size), glowing red as time runs out. */
function drawMonster({ ctx, view, pose }: FrameContext) {
  if (pose.monsterAlpha <= 0) return;
  const frames = monsterFrameCount(view.scene);
  const frame = frames > 1 ? Math.floor(pose.monsterFramePhase) % frames : 0;
  const img = monsterSprite(view.scene, frame, pose.danger > 0.6, pose.monsterFlash);
  const scale = isBossStage(view.stage) ? 2 : 1;
  const x = pose.monsterX;
  ctx.globalAlpha = pose.monsterAlpha;
  ctx.fillStyle = SHADOW;
  ctx.fillRect(Math.round(x + 3), GROUND_Y - 1, img.width * scale - 6, 2);
  ctx.save();
  ctx.translate(Math.round(x + img.width * scale), 0);
  ctx.scale(-1, 1); // face Kordi
  ctx.drawImage(img, 0, Math.round(GROUND_Y - img.height * scale - pose.monsterLift + 1), img.width * scale, img.height * scale);
  ctx.restore();
  if (pose.danger > 0.6 && !pose.monsterFlash) {
    glow(ctx, x + img.width * scale * 0.4, GROUND_Y - img.height * scale * 0.55, 10 * scale, "255, 60, 60", (pose.danger - 0.6) * 0.9);
  }
  ctx.globalAlpha = 1;
}

/** Kordi with scarf and baton (or tipping over at the end). Returns the sprite drawn. */
function drawHero({ ctx, view, pose, now }: FrameContext) {
  const time = now / 1000;
  const hero = heroSprite(pose.heroFrame);
  const top = GROUND_Y - HERO_HEIGHT - 2 + pose.heroBob;
  ctx.fillStyle = SHADOW;
  ctx.fillRect(Math.round(pose.heroX + 2), GROUND_Y - 1, hero.width - 4, 2);
  if (pose.heroFall > 0) {
    ctx.save();
    ctx.translate(Math.round(pose.heroX + hero.width / 2), GROUND_Y);
    ctx.rotate((-Math.PI / 2) * pose.heroFall);
    ctx.drawImage(hero, -Math.round(hero.width / 2), -hero.height);
    ctx.restore();
  } else {
    const walking = view.phase === "intro" || pose.heroFrame.startsWith("step");
    const scarf = scarfSprite(Math.floor(time * (walking ? 12 : 6)));
    ctx.drawImage(scarf, Math.round(pose.heroX - scarf.width + 3), Math.round(top + 11));
    ctx.drawImage(hero, Math.round(pose.heroX), Math.round(top));
    // a red flash around Kordi as the blow lands
    if (pose.hit > 0.05) glow(ctx, pose.heroX + hero.width / 2, top + hero.height / 2, 14, "255, 70, 70", pose.hit * 0.45);
    const baton = batonSprite();
    const bx = pose.heroX + hero.width - 4;
    const by = top + 10 - Math.round(pose.batonRaise * 6);
    ctx.drawImage(baton, Math.round(bx), Math.round(by));
    if (pose.batonRaise > 0.6) glow(ctx, bx + 4, by + 2, 9, "255, 215, 90", 0.5 * pose.batonRaise);
  }
  // a bead of sweat when it's getting close
  if (view.phase === "playing" && pose.danger > 0.5) {
    ctx.fillStyle = "#9fd8ff";
    ctx.fillRect(Math.round(pose.heroX + hero.width - 2), Math.round(top + 4 + ((time * 7) % 3)), 1, 2);
  }
  return hero;
}

/** Notes flying from the baton to the monster, with a fading trail. */
function drawNotes({ ctx, pose }: FrameContext, heroWidth: number) {
  if (pose.notes < 0) return;
  const colors = ["#fff4d0", "#ffd75a", "#ffb3d4"];
  for (let i = 0; i < 3; i++) {
    for (let trail = 3; trail >= 0; trail--) {
      const p = clamp01(pose.notes * 1.5 - i * 0.22 - trail * 0.04);
      if (p <= 0 || p >= 1) continue;
      const x = lerp(pose.heroX + heroWidth, pose.monsterX + 6, p);
      const y = GROUND_Y - 30 - Math.sin(p * Math.PI) * (14 + i * 5);
      ctx.globalAlpha = trail === 0 ? 1 : 0.35 / trail;
      ctx.drawImage(noteSprite(colors[i]), Math.round(x), Math.round(y));
      if (trail === 0) glow(ctx, x + 3, y + 4, 7, "255, 230, 150", 0.35);
    }
  }
  ctx.globalAlpha = 1;
}

/** The pixels of a burst monster (moved by stepBits). */
function drawBits({ ctx, fx }: FrameContext) {
  for (const b of fx.bits) {
    ctx.globalAlpha = Math.min(1, b.life * 2);
    ctx.fillStyle = b.color;
    ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** The scene's ambient dark, closing in to a pool around Kordi; a red heartbeat near the end. */
function drawDarkness({ ctx, light, lightCtx, view, pose, now, elapsed }: FrameContext) {
  const time = now / 1000;
  const darkness = Math.min(0.9, sceneAmbient(view.scene) + pose.danger * 0.62);
  if (darkness > 0.01) {
    const radius = lerp(LIGHT_CALM, LIGHT_LAST, easeIn(pose.danger)) + Math.sin(time * 9) * (pose.danger > 0.7 ? 2 : 0);
    lightCtx.clearRect(0, 0, W, H);
    lightCtx.globalCompositeOperation = "source-over";
    lightCtx.fillStyle = `rgba(${sceneDark(view.scene)}, ${darkness})`;
    lightCtx.fillRect(0, 0, W, H);
    lightCtx.globalCompositeOperation = "destination-out";
    const cx = pose.heroX + 10;
    const cy = GROUND_Y - 14;
    const hole = lightCtx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
    hole.addColorStop(0, "rgba(0,0,0,1)");
    hole.addColorStop(1, "rgba(0,0,0,0)");
    lightCtx.fillStyle = hole;
    lightCtx.fillRect(0, 0, W, H);
    ctx.drawImage(light, 0, 0);
  }
  if (pose.danger > 0.7 && view.phase === "playing") {
    const beat = Math.pow(Math.max(0, Math.sin(time * Math.PI * (1.6 + pose.danger * 1.6))), 6);
    const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
    edge.addColorStop(0, "rgba(0,0,0,0)");
    edge.addColorStop(1, `rgba(150, 10, 30, ${(pose.danger - 0.7) * 1.4 * (0.5 + beat * 0.5)})`);
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, W, H);
  }
  if (view.phase === "dying" || view.phase === "over") {
    const p = view.phase === "over" ? 1 : clamp01(elapsed / ADVENTURE_DEATH_MS);
    ctx.fillStyle = `rgba(30, 0, 10, ${p * 0.5})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Pop-up words, drawn over the dark so they always read. */
function drawPops({ ctx, fx, now, fontFamily }: FrameContext) {
  fx.pops = fx.pops.filter((p) => now - p.born < POP_MS);
  ctx.font = `8px ${fontFamily}`;
  ctx.textBaseline = "top";
  for (const p of fx.pops) {
    const age = (now - p.born) / POP_MS;
    const y = Math.round(p.y - easeOut(age) * 12);
    ctx.globalAlpha = 1 - Math.max(0, age - 0.6) / 0.4;
    ctx.fillStyle = "#1a1220";
    ctx.fillText(p.text, Math.round(p.x) + 1, y + 1);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, Math.round(p.x), y);
  }
  ctx.globalAlpha = 1;
}

/** The white flash as a monster bursts (gentle when the player prefers reduced motion). */
function drawHitFlash({ ctx, fx, dt, reducedMotion }: FrameContext) {
  if (fx.flash <= 0) return;
  ctx.fillStyle = `rgba(255, 250, 235, ${fx.flash * (reducedMotion ? 0.15 : 0.55)})`;
  ctx.fillRect(0, 0, W, H);
  fx.flash = Math.max(0, fx.flash - dt * 6);
}
