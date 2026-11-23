"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import type { ChordCard } from "../engine/chord-cards";
import type { PianoWorldCopy } from "./copy";
import { WARP_STONES, type WarpStoneId } from "../engine/island";

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
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-foreground/15 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-label={title} className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
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
    <svg viewBox={`0 0 ${14 * W + 2} ${H + 2}`} className="mt-4 block h-auto w-full" aria-hidden>
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
      <p className="mt-4 text-4xl font-semibold -tracking-[0.03em] text-foreground">{card.name}</p>
      <p className="mt-1 text-sm text-muted-foreground">{card.labels.join(" – ")}</p>
      <MiniKeyboard positions={card.positions} />
      <p className="mt-4 text-sm leading-relaxed text-foreground">{copy.cards[card.key]}</p>
      <Button type="button" onClick={onPlay} className="mt-5 w-full">
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
        className="mt-4 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground/40"
      />
      <p className="mt-2 text-xs text-muted-foreground">{copy.wishNote}</p>
      <Button
        type="button"
        onClick={() => {
          setText("");
          onSend();
        }}
        className="mt-4 w-full"
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
                className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground enabled:hover:bg-muted disabled:text-muted-foreground"
              >
                <span>{known ? copy.warpStones[id] : "???"}</span>
                <span className="text-xs text-muted-foreground">
                  {here ? copy.warpHere : known ? "" : copy.warpAsleep}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </PanelShell>
  );
}
