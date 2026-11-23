"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { ScoreTimeline } from "@/entities/score";
import { cn } from "@/shared/lib/utils";
import { extractTimeline } from "../lib/extract-timeline";

interface ScoreSheetProps {
  /** MusicXML text, or a compressed .mxl file */
  source: string | Blob | null;
  /** which cursor step to show (see ScoreGroup) */
  cursorIndex: number;
  onLoad: (timeline: ScoreTimeline) => void;
  onError: () => void;
  /** sizing of the sheet's own scroll box (the cursor is kept in view inside it) */
  className?: string;
}

/** Narrow screens get smaller notation, so a system still fits a few bars. */
const zoomFor = (width: number) => (width < 640 ? 0.6 : width < 1024 ? 0.8 : 1);

/**
 * The engraved score (OpenSheetMusicDisplay), with a cursor over the notes
 * being played. OSMD is loaded on demand — it is large and browser-only.
 */
export function ScoreSheet({ source, cursorIndex, onLoad, onError, className }: ScoreSheetProps) {
  const box = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const osmd = useRef<OpenSheetMusicDisplay | null>(null);
  /** how many steps the OSMD cursor has taken since its last reset */
  const steps = useRef(0);
  const [loading, setLoading] = useState(false);
  const callbacks = useRef({ onLoad, onError });

  useEffect(() => {
    callbacks.current = { onLoad, onError };
  }, [onLoad, onError]);

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
          autoResize: true,
          backend: "svg",
          drawTitle: true,
          drawComposer: true,
          drawPartNames: false,
          drawMeasureNumbers: true,
          // we scroll the sheet's own box instead (OSMD would scroll the whole page)
          followCursor: false,
          cursorsOptions: [{ type: 0, color: "#e0a030", alpha: 0.45, follow: false }],
        });
        await osmd.current.load(source);
        if (cancelled) return;
        osmd.current.zoom = zoomFor(el.clientWidth);
        osmd.current.render();
        box.current?.scrollTo({ top: 0 });
        osmd.current.cursor.show();
        osmd.current.cursor.reset();
        steps.current = 0;
        callbacks.current.onLoad(extractTimeline(osmd.current));
      } catch {
        if (!cancelled) callbacks.current.onError();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  // walk the cursor to the requested step (forward is cheap; going back resets first)
  useEffect(() => {
    const cursor = osmd.current?.cursor;
    if (!cursor || loading) return;
    if (cursorIndex < steps.current) {
      cursor.reset();
      steps.current = 0;
    }
    while (steps.current < cursorIndex && !cursor.Iterator.EndReached) {
      cursor.next();
      steps.current += 1;
    }
    // keep the cursor's system in view (with a little of the one above)
    const scroller = box.current;
    const marker = cursor.cursorElement;
    if (!scroller || !marker || cursorIndex === 0) return;
    const top = marker.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    const bottom = top + marker.getBoundingClientRect().height;
    if (top < scroller.scrollTop || bottom > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTo({ top: Math.max(0, top - 32), behavior: "smooth" });
    }
  }, [cursorIndex, loading]);

  return (
    <div ref={box} className={cn("relative overflow-y-auto", className)}>
      <div ref={container} />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center text-t3 text-fg-neutral-muted">…</div>
      ) : null}
    </div>
  );
}
