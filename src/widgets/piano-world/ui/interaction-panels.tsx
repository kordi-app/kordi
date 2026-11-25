"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, Lock, MapPin, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import type { ChordCard } from "../engine/chord-cards";
import type { PianoWorldCopy } from "./copy";
import { WARP_STONES, type WarpStoneId } from "../engine/island";
import { HUD_FOCUS } from "./hud/surface";

function PanelShell({
  title,
  onClose,
  closeLabel,
  children,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
}) {
  return (
    // The scrim is light on purpose: the world keeps going behind a panel, and you should
    // still see it. The panel's own shadow is what lifts it off the scene.
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-foreground/20 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label={title}
        className="max-h-full w-full max-w-sm overflow-y-auto rounded-container border border-border bg-card p-5 shadow-[0_2px_4px_var(--palette-gray-alpha-400),0_16px_40px_-8px_rgba(28,27,25,0.35)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold -tracking-[0.01em] text-foreground">{title}</h2>
          {/* a 40px target whose icon still lines up with the panel's padding (hence the negative margin) */}
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className={cn(
              HUD_FOCUS,
              "-my-2 -mr-2.5 flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:bg-secondary-hover motion-reduce:transition-none",
            )}
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const WHITE_INDEX = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

/** Two-octave diagram with the chord tones dotted (chord-book style). */
function MiniKeyboard({ positions }: { positions: number[] }) {
  const marked = new Set(positions);
  const W = 22, H = 92, BW = 13, BH = 56;
  const semis = Array.from({ length: 24 }, (_, i) => i);
  const whiteX = (s: number) => 1 + (Math.floor(s / 12) * 7 + WHITE_INDEX[s % 12]) * W;
  const blackX = (s: number) => whiteX(s) + W - BW / 2;
  return (
    <svg viewBox={`0 0 ${14 * W + 2} ${H + 2}`} className="mt-5 block h-auto w-full" aria-hidden>
      {semis.filter((s) => !IS_BLACK[s % 12]).map((s) => (
        <g key={s}>
          <rect x={whiteX(s)} y={1} width={W} height={H} rx={3} fill="var(--card)" stroke="var(--outline)" strokeOpacity={0.45} />
          {marked.has(s) ? <circle cx={whiteX(s) + W / 2} cy={H - 14} r={6} fill="var(--foreground)" /> : null}
        </g>
      ))}
      {semis.filter((s) => IS_BLACK[s % 12]).map((s) => (
        <g key={s}>
          <rect x={blackX(s)} y={1} width={BW} height={BH} rx={2} fill="var(--foreground)" />
          {marked.has(s) ? <circle cx={blackX(s) + BW / 2} cy={BH - 11} r={4.5} fill="var(--card)" /> : null}
        </g>
      ))}
    </svg>
  );
}

export function ChordCardPanel({
  card,
  copy,
  onClose,
  onPlay,
}: {
  card: ChordCard;
  copy: PianoWorldCopy;
  onClose: () => void;
  onPlay: () => void;
}) {
  return (
    <PanelShell title={copy.cardTitle} onClose={onClose} closeLabel={copy.close}>
      <p className="mt-5 text-4xl font-semibold -tracking-[0.03em] text-foreground">{card.name}</p>
      <p className="mt-1 text-sm font-medium tracking-[0.04em] tabular-nums text-muted-foreground">
        {card.labels.join(" – ")}
      </p>
      <MiniKeyboard positions={card.positions} />
      <p className="mt-4 break-keep text-sm leading-relaxed text-foreground/90">{copy.cards[card.key]}</p>
      <Button type="button" size="lg" onClick={onPlay} className="mt-5 w-full text-sm">
        {copy.cardPlay}
      </Button>
    </PanelShell>
  );
}

/**
 * Write a wish to the music box. Deliberately ephemeral: the text never
 * leaves this component's state and is discarded on send.
 */
export function WishPanel({
  copy,
  onClose,
  onSend,
}: {
  copy: PianoWorldCopy;
  onClose: () => void;
  onSend: () => void;
}) {
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => input.current?.focus(), []);

  return (
    <PanelShell title={copy.wishTitle} onClose={onClose} closeLabel={copy.close}>
      <textarea
        ref={input}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={200}
        rows={4}
        placeholder={copy.wishPlaceholder}
        // 16px on touch: iOS zooms the page into any field set smaller than that
        className="mt-4 block w-full resize-none rounded-control border border-input bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-placeholder hover:border-control-border-hover focus-visible:border-control-border-hover focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none pointer-coarse:text-base"
      />
      <p className="mt-2 break-keep text-xs leading-relaxed text-muted-foreground">{copy.wishNote}</p>
      <Button
        type="button"
        size="lg"
        onClick={() => {
          setText("");
          onSend();
        }}
        className="mt-4 w-full text-sm"
      >
        {copy.wishSend}
      </Button>
    </PanelShell>
  );
}

/** Pick an awake warp stone to jump to. Stones you haven't found yet show as locked. */
export function WarpPanel({
  from,
  awake,
  copy,
  onClose,
  onWarp,
}: {
  from: WarpStoneId;
  awake: ReadonlySet<WarpStoneId>;
  copy: PianoWorldCopy;
  onClose: () => void;
  onWarp: (to: WarpStoneId) => void;
}) {
  return (
    <PanelShell title={copy.warpTitle} onClose={onClose} closeLabel={copy.close}>
      <ul className="mt-4 flex flex-col gap-1.5">
        {WARP_STONES.map(({ id }) => {
          const here = id === from;
          const known = awake.has(id);
          return (
            <li key={id}>
              <button
                type="button"
                disabled={here || !known}
                onClick={() => onWarp(id)}
                className={cn(
                  HUD_FOCUS,
                  "group flex min-h-11 w-full items-center gap-2.5 rounded-control border border-border px-3 py-2 text-left text-sm transition-[background-color,border-color,scale] duration-150 motion-reduce:transition-none",
                  "enabled:font-medium enabled:text-foreground enabled:hover:border-control-border enabled:hover:bg-muted enabled:active:scale-[0.99] motion-reduce:enabled:active:scale-100",
                  // where you are is a fact, not a dead end: tinted. A stone you haven't found recedes.
                  here ? "bg-muted text-foreground" : "disabled:border-dashed disabled:text-fg-neutral-subtle",
                )}
              >
                {/* one icon column, so the names line up whatever state the stone is in */}
                {here ? (
                  <MapPin aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                ) : known ? (
                  <span aria-hidden className="mx-1 size-2 shrink-0 rotate-45 rounded-[2px] bg-palette-purple-500" />
                ) : (
                  <Lock aria-hidden className="size-4 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{known ? copy.warpStones[id] : "???"}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {here ? copy.warpHere : known ? "" : copy.warpAsleep}
                </span>
                {known && !here ? (
                  <ChevronRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </PanelShell>
  );
}
