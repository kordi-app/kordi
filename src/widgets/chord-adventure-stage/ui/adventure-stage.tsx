"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Press_Start_2P } from "next/font/google";
import { useTranslations } from "next-intl";
import {
  ADVENTURE_DEATH_MS,
  ADVENTURE_INTRO_MS,
  ADVENTURE_VICTORY_MS,
  STAGES_PER_SCENE,
  sceneFor,
  type AdventureClock,
  type AdventureView,
} from "@/entities/chord-adventure";
import { toDisplayChordName } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";
import { GROUND_Y, H, W, drawParticles, drawScene, glow, sceneAmbient, sceneDark } from "../lib/scenes";
import {
  HERO_HEIGHT,
  batonSprite,
  heroSprite,
  monsterFrameCount,
  monsterSprite,
  noteSprite,
  scarfSprite,
  type HeroFrame,
} from "../lib/sprites";

const pixelFont = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

/** Where things stand (logical px). The monster closes in from FAR to NEAR as time runs out. */
const HERO_X = 64;
const MONSTER_FAR_X = 224;
const MONSTER_NEAR_X = HERO_X + 24;
/** How far the world scrolls while walking to the next monster. */
const WALK_DISTANCE = 150;
/** The light around Kordi: wide when calm, a small pool at the end. */
const LIGHT_CALM = 170;
const LIGHT_LAST = 34;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeIn = (v: number) => v * v;
const easeOut = (v: number) => 1 - (1 - v) * (1 - v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Bit {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Pop {
  text: string;
  color: string;
  x: number;
  y: number;
  born: number;
}

const isBoss = (stage: number) => stage % STAGES_PER_SCENE === 0;

/**
 * The game screen: Kordi on the left, the monster on the right, both acting
 * on their own — the piano below is the only control. Time running out is
 * shown, never counted: the monster creeps in, its eyes turn red, and the
 * light around Kordi closes to a small pool. A wrong chord makes it lunge;
 * the right one fires notes from Kordi's baton and it bursts into pixels.
 */
export function AdventureStage({ view, clock }: { view: AdventureView; clock: RefObject<AdventureClock> }) {
  const t = useTranslations("chordAdventure");
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  const fx = useRef({
    scroll: 0,
    bits: [] as Bit[],
    pops: [] as Pop[],
    burstFor: -1,
    missSeen: -Infinity,
    flash: 0,
    light: null as HTMLCanvasElement | null,
  });

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const f = fx.current;
    if (!f.light) {
      f.light = document.createElement("canvas");
      f.light.width = W;
      f.light.height = H;
    }
    const lightCtx = f.light.getContext("2d")!;
    const fontFamily = pixelFont.style.fontFamily;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = viewRef.current;
      const c = clock.current;
      const elapsed = now - c.phaseStartedAt;
      const time = now / 1000;
      const boss = isBoss(v.stage);
      // a new run starts clean (otherwise "already burst for stage 1" would carry over)
      if (v.phase === "ready" || v.phase === "intro") {
        f.burstFor = -1;
        f.pops.length = 0;
      }

      // ── where everyone is this frame ──────────────────────────────
      let heroX = HERO_X;
      let heroBob = 0;
      let heroFrame: HeroFrame = Math.floor(time * 1.3) % 6 === 0 && time % 0.77 < 0.12 ? "blink" : "idle";
      let heroFall = 0;
      let batonRaise = 0;
      let monsterX = MONSTER_FAR_X;
      let monsterAlpha = 1;
      let monsterFlash = false;
      let danger = 0;
      let shake = 0;
      let notes = -1;
      let sceneMix = 0;
      const walking = Math.floor(time * 9) % 2 === 0 ? "stepA" : "stepB";

      switch (v.phase) {
        case "ready":
        case "loading":
          monsterAlpha = 0;
          heroBob = Math.round(Math.sin(time * 2.5));
          break;
        case "intro": {
          const p = clamp01(elapsed / ADVENTURE_INTRO_MS);
          heroX = lerp(-24, HERO_X, easeOut(p));
          heroFrame = walking;
          f.scroll += dt * 50;
          monsterAlpha = 0;
          break;
        }
        case "playing": {
          danger = clamp01((elapsed + c.penaltyMs) / c.limitMs);
          const lunge = Math.max(0, 1 - (now - c.lastMissAt) / 380);
          if (c.lastMissAt !== f.missSeen && now - c.lastMissAt < 100) {
            f.missSeen = c.lastMissAt;
            f.pops.push({ text: "MISS", color: "#ff5a5a", x: MONSTER_FAR_X - 20, y: 52, born: now });
          }
          monsterX = lerp(MONSTER_FAR_X, MONSTER_NEAR_X + (boss ? 10 : 0), easeIn(danger)) - lunge * 18;
          monsterAlpha = clamp01(elapsed / 350);
          heroBob = Math.round(Math.sin(time * (2.5 + danger * 7)));
          heroFrame = lunge > 0.25 || danger > 0.88 ? "ouch" : heroFrame;
          batonRaise = 0.3;
          shake = lunge * 2.5 + (danger > 0.8 ? (danger - 0.8) * 8 * (Math.sin(time * 7) > 0.6 ? 1 : 0.3) : 0);
          break;
        }
        case "victory": {
          const fireEnd = 560;
          const walkStart = 900;
          monsterX = lerp(MONSTER_FAR_X, MONSTER_NEAR_X, 0.2);
          batonRaise = elapsed < fireEnd ? 1 : Math.max(0, 1 - (elapsed - fireEnd) / 300);
          if (elapsed < fireEnd) notes = elapsed / fireEnd;
          monsterFlash = elapsed > fireEnd - 90 && elapsed < fireEnd + 120;
          monsterAlpha = elapsed < fireEnd + 120 ? 1 : 0;
          if (elapsed >= fireEnd && f.burstFor !== v.stage) {
            f.burstFor = v.stage;
            f.flash = 1;
            burst(f.bits, monsterX + (boss ? 24 : 12), GROUND_Y - (boss ? 24 : 12), v.scene, boss);
            const used = c.lastAnswerUsed;
            const [text, color] = used < 0.34 ? ["PERFECT!", "#ffe066"] : used < 0.67 ? ["GREAT!", "#8fe3ff"] : ["GOOD", "#c9f2b0"];
            f.pops.push({ text, color, x: monsterX - 10, y: 48, born: now });
          }
          if (elapsed > walkStart) {
            const p = clamp01((elapsed - walkStart) / (ADVENTURE_VICTORY_MS - walkStart));
            f.scroll += dt * (WALK_DISTANCE / ((ADVENTURE_VICTORY_MS - walkStart) / 1000));
            heroFrame = walking;
            if (sceneFor(v.stage + 1) !== v.scene) sceneMix = clamp01((p - 0.15) / 0.6);
          } else {
            heroBob = -Math.round(Math.sin(clamp01(elapsed / fireEnd) * Math.PI) * 5);
          }
          break;
        }
        case "dying":
        case "over": {
          const p = v.phase === "over" ? 1 : clamp01(elapsed / ADVENTURE_DEATH_MS);
          danger = 1;
          monsterX = MONSTER_NEAR_X + (boss ? 10 : 0) - Math.sin(clamp01(p * 3) * Math.PI) * 10;
          heroFrame = "ouch";
          heroFall = clamp01((p - 0.18) / 0.3);
          heroX = HERO_X - heroFall * 14;
          shake = p < 0.35 ? 4 * (1 - p / 0.35) : 0;
          break;
        }
      }

      // ── draw ───────────────────────────────────────────────────────
      ctx.save();
      if (reducedMotion) shake = 0;
      if (shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));

      drawScene(ctx, v.scene, f.scroll, time);
      if (sceneMix > 0) {
        ctx.globalAlpha = sceneMix;
        drawScene(ctx, sceneFor(v.stage + 1), f.scroll, time);
        ctx.globalAlpha = 1;
      }

      // monster (bosses are drawn at double size)
      const monsterScene = v.scene;
      if (monsterAlpha > 0) {
        const fc = monsterFrameCount(monsterScene);
        const mFrame = fc > 1 ? Math.floor(time * (6 + danger * 10)) % fc : 0;
        const img = monsterSprite(monsterScene, mFrame, danger > 0.6, monsterFlash);
        const scale = boss ? 2 : 1;
        const hop = Math.round(Math.abs(Math.sin(time * (3.5 + danger * 9))) * (2 + danger * 2));
        ctx.globalAlpha = monsterAlpha;
        // shadow on the ground
        ctx.fillStyle = "rgba(10, 6, 20, 0.35)";
        ctx.fillRect(Math.round(monsterX + 3), GROUND_Y - 1, img.width * scale - 6, 2);
        ctx.save();
        ctx.translate(Math.round(monsterX + img.width * scale), 0);
        ctx.scale(-1, 1); // face Kordi
        ctx.drawImage(img, 0, Math.round(GROUND_Y - img.height * scale - hop + 1), img.width * scale, img.height * scale);
        ctx.restore();
        if (danger > 0.6 && !monsterFlash) glow(ctx, monsterX + img.width * scale * 0.4, GROUND_Y - img.height * scale * 0.55, 10 * scale, "255, 60, 60", (danger - 0.6) * 0.9);
        ctx.globalAlpha = 1;
      }

      // Kordi
      const hero = heroSprite(heroFrame);
      const heroTop = GROUND_Y - HERO_HEIGHT - 2 + heroBob;
      ctx.fillStyle = "rgba(10, 6, 20, 0.35)";
      ctx.fillRect(Math.round(heroX + 2), GROUND_Y - 1, hero.width - 4, 2);
      if (heroFall > 0) {
        ctx.save();
        ctx.translate(Math.round(heroX + hero.width / 2), GROUND_Y);
        ctx.rotate((-Math.PI / 2) * heroFall);
        ctx.drawImage(hero, -Math.round(hero.width / 2), -hero.height);
        ctx.restore();
      } else {
        const scarf = scarfSprite(Math.floor(time * (v.phase === "intro" || heroFrame.startsWith("step") ? 12 : 6)));
        ctx.drawImage(scarf, Math.round(heroX - scarf.width + 3), Math.round(heroTop + 11));
        ctx.drawImage(hero, Math.round(heroX), Math.round(heroTop));
        const baton = batonSprite();
        const bx = heroX + hero.width - 4;
        const by = heroTop + 10 - Math.round(batonRaise * 6);
        ctx.drawImage(baton, Math.round(bx), Math.round(by));
        if (batonRaise > 0.6) glow(ctx, bx + 4, by + 2, 9, "255, 215, 90", 0.5 * batonRaise);
      }
      if (v.phase === "playing" && danger > 0.5) {
        ctx.fillStyle = "#9fd8ff";
        ctx.fillRect(Math.round(heroX + hero.width - 2), Math.round(heroTop + 4 + ((time * 7) % 3)), 1, 2);
      }

      // notes flying from the baton, with a fading trail
      if (notes >= 0) {
        const colors = ["#fff4d0", "#ffd75a", "#ffb3d4"];
        for (let i = 0; i < 3; i++) {
          for (let trail = 3; trail >= 0; trail--) {
            const p = clamp01(notes * 1.5 - i * 0.22 - trail * 0.04);
            if (p <= 0 || p >= 1) continue;
            const x = lerp(heroX + hero.width, monsterX + 6, p);
            const y = GROUND_Y - 30 - Math.sin(p * Math.PI) * (14 + i * 5);
            ctx.globalAlpha = trail === 0 ? 1 : 0.35 / trail;
            ctx.drawImage(noteSprite(colors[i]), Math.round(x), Math.round(y));
            if (trail === 0) glow(ctx, x + 3, y + 4, 7, "255, 230, 150", 0.35);
          }
        }
        ctx.globalAlpha = 1;
      }

      // bits of the monster (and sparks)
      f.bits = f.bits.filter((b) => (b.life -= dt) > 0 && b.y < H);
      for (const b of f.bits) {
        b.vy += 180 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.y > GROUND_Y) {
          b.y = GROUND_Y;
          b.vy *= -0.35;
          b.vx *= 0.7;
        }
        ctx.globalAlpha = Math.min(1, b.life * 2);
        ctx.fillStyle = b.color;
        ctx.fillRect(Math.round(b.x), Math.round(b.y), 1, 1);
      }
      ctx.globalAlpha = 1;

      drawParticles(ctx, v.scene, f.scroll, time);

      // ── light: the scene's ambient dark, closing in to a pool around Kordi ──
      const darkness = Math.min(0.9, sceneAmbient(v.scene) + danger * 0.62);
      if (darkness > 0.01) {
        const radius = lerp(LIGHT_CALM, LIGHT_LAST, easeIn(danger)) + Math.sin(time * 9) * (danger > 0.7 ? 2 : 0);
        lightCtx.clearRect(0, 0, W, H);
        lightCtx.globalCompositeOperation = "source-over";
        lightCtx.fillStyle = `rgba(${sceneDark(v.scene)}, ${darkness})`;
        lightCtx.fillRect(0, 0, W, H);
        lightCtx.globalCompositeOperation = "destination-out";
        const cx = heroX + 10;
        const cy = GROUND_Y - 14;
        const hole = lightCtx.createRadialGradient(cx, cy, radius * 0.25, cx, cy, radius);
        hole.addColorStop(0, "rgba(0,0,0,1)");
        hole.addColorStop(1, "rgba(0,0,0,0)");
        lightCtx.fillStyle = hole;
        lightCtx.fillRect(0, 0, W, H);
        ctx.drawImage(f.light!, 0, 0);
      }
      // the end is near: a red heartbeat at the edges
      if (danger > 0.7 && v.phase === "playing") {
        const beat = Math.pow(Math.max(0, Math.sin(time * Math.PI * (1.6 + danger * 1.6))), 6);
        const edge = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.62);
        edge.addColorStop(0, "rgba(0,0,0,0)");
        edge.addColorStop(1, `rgba(150, 10, 30, ${(danger - 0.7) * 1.4 * (0.5 + beat * 0.5)})`);
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, W, H);
      }
      if (v.phase === "dying" || v.phase === "over") {
        const p = v.phase === "over" ? 1 : clamp01(elapsed / ADVENTURE_DEATH_MS);
        ctx.fillStyle = `rgba(30, 0, 10, ${p * 0.5})`;
        ctx.fillRect(0, 0, W, H);
      }

      // pop-up words (over the dark, so they always read)
      f.pops = f.pops.filter((p) => now - p.born < 900);
      ctx.font = `8px ${fontFamily}`;
      ctx.textBaseline = "top";
      for (const p of f.pops) {
        const age = (now - p.born) / 900;
        const y = Math.round(p.y - easeOut(age) * 12);
        ctx.globalAlpha = 1 - Math.max(0, age - 0.6) / 0.4;
        ctx.fillStyle = "#1a1220";
        ctx.fillText(p.text, Math.round(p.x) + 1, y + 1);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, Math.round(p.x), y);
      }
      ctx.globalAlpha = 1;

      // the hit flash (gentle when the player prefers reduced motion)
      if (f.flash > 0) {
        ctx.fillStyle = `rgba(255, 250, 235, ${f.flash * (reducedMotion ? 0.15 : 0.55)})`;
        ctx.fillRect(0, 0, W, H);
        f.flash = Math.max(0, f.flash - dt * 6);
      }
      ctx.restore();
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [clock]);

  const fighting = view.phase === "playing";
  const world = Math.floor((view.stage - 1) / STAGES_PER_SCENE) + 1;
  const round = ((view.stage - 1) % STAGES_PER_SCENE) + 1;
  const newWorld = fighting && round === 1;

  return (
    <div className={cn("relative w-full overflow-hidden rounded-card bg-palette-gray-1000 shadow-pixel", pixelFont.className)}>
      <canvas
        ref={canvas}
        width={W}
        height={H}
        className="block aspect-[2/1] w-full [image-rendering:pixelated]"
        role="img"
        aria-label={t("stageLabel")}
      />

      {/* HUD: world-round, and how many you've beaten (a count, never a clock) */}
      {view.phase !== "ready" && view.phase !== "loading" ? (
        <div className="absolute top-3 right-3 left-3 flex items-start justify-between text-[10px] leading-none text-palette-gray-00 md:text-t2">
          <span className="rounded-r1 bg-palette-gray-1000/70 px-2 py-1.5">
            {world}-{round}
          </span>
          <span className="rounded-r1 bg-palette-gray-1000/70 px-2 py-1.5 tabular-nums">KO {view.defeated}</span>
        </div>
      ) : null}

      {/* the chord to play, on a pixel plate */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-[16%] flex justify-center transition-[opacity,transform] duration-150",
          fighting && view.chord ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
        )}
        aria-live="polite"
        aria-hidden={!fighting}
      >
        <div className="border-2 border-palette-gray-1000 bg-palette-gray-00 px-4 py-2.5 text-t5 text-palette-gray-1000 shadow-pixel md:px-5 md:py-3 md:text-t9">
          {fighting && view.chord ? toDisplayChordName(view.chord.name) : ""}
        </div>
      </div>

      {newWorld || (fighting && isBoss(view.stage)) ? (
        <Banner key={view.stage} title={isBoss(view.stage) ? "BOSS" : `WORLD ${world}`} subtitle={t(`scenes.${view.scene}`)} danger={isBoss(view.stage)} />
      ) : null}
    </div>
  );
}

/** "WORLD 2" / "BOSS" across the middle for a moment when it starts. */
function Banner({ title, subtitle, danger }: { title: string; subtitle: string; danger: boolean }) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), 1500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-[22%] flex flex-col items-center gap-2 transition-opacity duration-300",
        shown ? "opacity-100" : "opacity-0",
      )}
    >
      <span className={cn("text-t5 drop-shadow-[2px_2px_0_var(--palette-gray-1000)] md:text-t8", danger ? "text-palette-red-300" : "text-palette-gray-00")}>
        {title}
      </span>
      <span className="font-sans text-t3 font-semibold text-palette-gray-00 drop-shadow-[1px_1px_0_var(--palette-gray-1000)]">{subtitle}</span>
    </div>
  );
}

/** What each scene's monster breaks into. */
const BURST_COLORS: Record<AdventureView["scene"], string[]> = {
  meadow: ["#ff7eb6", "#ffb3d4", "#ffe3f0", "#c94f86"],
  forest: ["#ff8a3d", "#fff3d6", "#f3dcc0", "#c45a1f"],
  cave: ["#a05ad6", "#7b3fb8", "#ffd75a", "#c58cf0"],
  castle: ["#9aa3b8", "#cdd4e4", "#4fc3ff", "#ffd75a"],
  volcano: ["#ff5a36", "#ffd23f", "#ff8f66", "#fff36b"],
};

function burst(into: Bit[], x: number, y: number, scene: AdventureView["scene"], boss: boolean) {

  const n = boss ? 70 : 40;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 30 + Math.random() * (boss ? 90 : 60);
    into.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 50, life: 0.8 + Math.random() * 0.8, color: BURST_COLORS[scene][i % 4] });
  }
  // a white star of sparks at the impact
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    into.push({ x, y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.25, color: "#ffffff" });
  }
}
