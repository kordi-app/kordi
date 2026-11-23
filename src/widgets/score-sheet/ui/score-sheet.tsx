"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { ScoreTimeline } from "@/entities/score";
import { cn } from "@/shared/lib/utils";
import { extractTimeline } from "../lib/extract-timeline";

/** Where the music is: cursor step `index`, `fraction` of the way to the next step. */
export interface SheetPosition {
  index: number;
  fraction: number;
}

interface ScoreSheetProps {
  /** MusicXML text, or a compressed .mxl file */
  source: string | Blob | null;
  /** the step to show while stopped */
  cursorIndex: number;
  /** read every frame while playing: the playhead glides between steps */
  getPosition?: () => SheetPosition | null;
  /** a click on the sheet: the step nearest to it */
  onSeek?: (index: number) => void;
  onLoad: (timeline: ScoreTimeline) => void;
  onError: () => void;
  /** sizing of the sheet's own scroll box (the playhead is kept in view inside it) */
  className?: string;
}

/** A cursor step on the page: its x (centre), line top and height, and where its line ends. */
interface StepBox {
  /** when it sounds, in whole notes (to place steps OSMD draws out of order) */
  time: number;
  x: number;
  top: number;
  height: number;
  lineEnd: number;
}

/** OSMD draws in units of 10 px (times the zoom). */
const UNIT = 10;
/** Narrow screens get smaller notation, so a system still fits a few bars. */
const zoomFor = (width: number) => (width < 640 ? 0.6 : width < 1024 ? 0.8 : 1);

/**
 * The engraved score (OpenSheetMusicDisplay) with a playhead. OSMD's own
 * cursor jumps from note to note; we measure where each of its steps sits
 * once, then draw our own line that glides between them every frame.
 * OSMD is loaded on demand — it is large and browser-only.
 */
export function ScoreSheet({ source, cursorIndex, getPosition, onSeek, onLoad, onError, className }: ScoreSheetProps) {
  const box = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const osmd = useRef<OpenSheetMusicDisplay | null>(null);
  const steps = useRef<StepBox[]>([]);
  const [loading, setLoading] = useState(false);
  const latest = useRef({ onLoad, onError, getPosition, cursorIndex });

  useEffect(() => {
    latest.current = { onLoad, onError, getPosition, cursorIndex };
  }, [onLoad, onError, getPosition, cursorIndex]);

  useEffect(() => {
    if (!source || !container.current) return;
    let cancelled = false;
    const el = container.current;
    (async () => {
      setLoading(true);
      try {
        const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
        if (cancelled) return;
        osmd.current ??= new OpenSheetMusicDisplay(el, {
          // we re-render on resize ourselves (and re-measure the steps)
          autoResize: false,
          backend: "svg",
          drawTitle: true,
          drawComposer: true,
          drawPartNames: false,
          drawMeasureNumbers: true,
          followCursor: false,
          cursorsOptions: [{ type: 0, color: "#e0a030", alpha: 0, follow: false }],
        });
        await osmd.current.load(source);
        if (cancelled) return;
        steps.current = draw(osmd.current, el);
        box.current?.scrollTo({ top: 0 });
        latest.current.onLoad(extractTimeline(osmd.current));
      } catch {
        if (!cancelled) latest.current.onError();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  // a new width: lay the score out again
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let width = el.clientWidth;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (osmd.current?.IsReadyToRender()) steps.current = draw(osmd.current, el);
      }, 200);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // the playhead: placed every frame, between the step it's at and the next
  useEffect(() => {
    let frame = 0;
    let lastTop = -1;
    const place = () => {
      frame = requestAnimationFrame(place);
      const line = playhead.current;
      const all = steps.current;
      if (!line || all.length === 0) return;
      const { getPosition: read, cursorIndex: stopped } = latest.current;
      const pos = read?.() ?? { index: stopped, fraction: 0 };
      const here = all[Math.min(pos.index, all.length - 1)];
      const next = all[pos.index + 1];
      // to the next note on this line, or on to the end of the line before wrapping
      const target = next && next.top === here.top ? next.x : here.lineEnd;
      const x = here.x + (target - here.x) * pos.fraction;
      line.style.transform = `translate(${x}px, ${here.top}px)`;
      line.style.height = `${here.height}px`;
      line.style.opacity = "1";
      if (here.top !== lastTop) {
        lastTop = here.top;
        keepInView(box.current, here);
      }
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div ref={box} className={cn("relative overflow-y-auto", className)}>
      <div
        className={cn("relative", onSeek && "cursor-pointer")}
        onClick={(e) => {
          if (!onSeek) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const index = stepAt(steps.current, e.clientX - rect.left, e.clientY - rect.top);
          if (index !== null) onSeek(index);
        }}
      >
        <div ref={container} />
        <div
          ref={playhead}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 w-0.5 -translate-x-1/2 rounded-full bg-palette-yellow-500 opacity-0 shadow-[0_0_0_4px_color-mix(in_oklab,var(--palette-yellow-300)_45%,transparent)] will-change-transform"
        />
      </div>
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center text-t3 text-fg-neutral-muted">…</div>
      ) : null}
    </div>
  );
}

/** Lay the score out for the container's width, then measure every cursor step. */
function draw(osmd: OpenSheetMusicDisplay, el: HTMLElement): StepBox[] {
  osmd.zoom = zoomFor(el.clientWidth);
  osmd.render();
  const scale = UNIT * osmd.zoom;
  const systems = osmd.GraphicSheet.MusicPages.flatMap((page) =>
    page.MusicSystems.map((system) => {
      const box = system.PositionAndShape;
      return {
        top: (box.AbsolutePosition.y + box.BorderTop) * scale,
        bottom: (box.AbsolutePosition.y + box.BorderBottom) * scale,
        right: (box.AbsolutePosition.x + box.BorderRight) * scale,
      };
    }),
  );

  const cursor = osmd.cursor;
  cursor.show();
  cursor.reset();
  const boxes: StepBox[] = [];
  while (!cursor.Iterator.EndReached) {
    const marker = cursor.cursorElement;
    const left = parseFloat(marker.style.left) || 0;
    const top = parseFloat(marker.style.top) || 0;
    const height = parseFloat(marker.style.height) || marker.height;
    const width = parseFloat(marker.style.width) || marker.width;
    const middle = top + height / 2;
    const system = systems.find((s) => middle >= s.top - 10 && middle <= s.bottom + 10);
    boxes.push({
      time: cursor.Iterator.currentTimeStamp.RealValue,
      x: left + width / 2,
      top,
      height,
      lineEnd: system?.right ?? el.clientWidth - 16,
    });
    cursor.next();
  }
  cursor.reset();
  cursor.hide();
  return keepMovingForward(boxes);
}

/**
 * OSMD occasionally places a step's cursor left of the one before it (a voice
 * that only continues there). Along a line the playhead must only move right,
 * so such a step is placed by its time between its in-order neighbours.
 */
function keepMovingForward(boxes: StepBox[]): StepBox[] {
  const out = boxes.map((b) => ({ ...b }));
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    if (out[i].top !== prev.top || out[i].x >= prev.x) continue;
    // the next step on this line that is right of prev (or the line's end)
    let j = i + 1;
    while (j < out.length && out[j].top === prev.top && out[j].x <= prev.x) j++;
    const next = j < out.length && out[j].top === prev.top ? out[j] : { x: prev.lineEnd, time: prev.time + 1 };
    for (let k = i; k < j; k++) {
      const span = next.time - prev.time;
      const t = span > 0 ? (out[k].time - prev.time) / span : 0;
      out[k].x = prev.x + (next.x - prev.x) * Math.min(Math.max(t, 0), 1);
    }
    i = j - 1;
  }
  return out;
}

/**
 * The step under a click: on the line that was clicked (or the nearest one),
 * the note closest to the click.
 */
function stepAt(steps: StepBox[], x: number, y: number): number | null {
  if (steps.length === 0) return null;
  const distance = (s: StepBox) => (y < s.top ? s.top - y : y > s.top + s.height ? y - s.top - s.height : 0);
  const lineTop = steps.reduce((best, s) => (distance(s) < distance(best) ? s : best)).top;
  let pick: number | null = null;
  steps.forEach((s, i) => {
    if (s.top !== lineTop) return;
    if (pick === null || Math.abs(s.x - x) < Math.abs(steps[pick].x - x)) pick = i;
  });
  return pick;
}

/** Scroll the sheet's box so the playhead's line is visible (with a little of the line above). */
function keepInView(scroller: HTMLElement | null, step: StepBox) {
  if (!scroller) return;
  const visibleTop = scroller.scrollTop;
  const visibleBottom = visibleTop + scroller.clientHeight;
  if (step.top < visibleTop || step.top + step.height > visibleBottom) {
    scroller.scrollTo({ top: Math.max(0, step.top - 32), behavior: "smooth" });
  }
}
