"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Press_Start_2P } from "next/font/google";
import { useTranslations } from "next-intl";
import { STAGES_PER_SCENE, type AdventureClock, type AdventureView } from "@/entities/chord-adventure";
import { toDisplayChordName } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";
import { isBoss, posePlayers } from "../lib/pose";
import { renderStage } from "../lib/render";
import { H, W } from "../lib/scenes";
import { createStageFx, stepBits } from "../lib/stage-fx";

const pixelFont = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

/**
 * The game screen: Kordi on the left, the monster on the right, both acting
 * on their own — the piano below is the only control. Time running out is
 * shown, never counted: the monster creeps in, its eyes turn red, and the
 * light around Kordi closes to a small pool. A wrong chord makes it lunge;
 * the right one fires notes from Kordi's baton and it bursts into pixels.
 *
 * Each frame: lib/pose works out where everyone is (and advances the effects),
 * lib/render draws it. This component only runs the loop and the HTML overlay.
 */
export function AdventureStage({ view, clock }: { view: AdventureView; clock: RefObject<AdventureClock> }) {
  const t = useTranslations("chordAdventure");
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef(view);
  const fx = useRef(createStageFx());

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const light = document.createElement("canvas");
    light.width = W;
    light.height = H;
    const lightCtx = light.getContext("2d")!;
    const fontFamily = pixelFont.style.fontFamily;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const view = viewRef.current;
      const pose = posePlayers(view, clock.current, fx.current, now, dt);
      stepBits(fx.current, dt);
      renderStage({
        ctx,
        light,
        lightCtx,
        view,
        pose,
        fx: fx.current,
        now,
        dt,
        elapsed: now - clock.current.phaseStartedAt,
        fontFamily,
        reducedMotion,
      });
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [clock]);

  const fighting = view.phase === "playing";
  const world = Math.floor((view.stage - 1) / STAGES_PER_SCENE) + 1;
  const round = ((view.stage - 1) % STAGES_PER_SCENE) + 1;
  const newWorld = fighting && round === 1;

  return (
    // a card like the rest of the page (soft shadow, hairline edge); the canvas is
    // rounded itself too — a pixelated canvas can escape its parent's rounded clip
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-card bg-palette-gray-1000 shadow-raised ring-1 ring-palette-gray-1000/15",
        pixelFont.className,
      )}
    >
      <canvas
        ref={canvas}
        width={W}
        height={H}
        className="block aspect-[2/1] w-full rounded-[inherit] [image-rendering:pixelated]"
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
