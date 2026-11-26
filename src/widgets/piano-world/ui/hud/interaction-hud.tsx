"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import type { PianoWorldCopy } from "../copy";
import { EMOTES, EMOTE_ICON, type EmoteId, type InteractableId } from "../../engine/interactables";
import { HUD_CHIP, HUD_ENTER, HUD_FOCUS, HUD_PRESSABLE, HUD_SURFACE } from "./surface";

/** Right edge: 1–4 emotes. */
export function EmoteBar({
  emote,
  onToggle,
  copy,
}: {
  emote: EmoteId | null;
  onToggle: (id: EmoteId) => void;
  copy: PianoWorldCopy;
}) {
  return (
    // One rail rather than four loose tiles: they are one control (pick an emote).
    // touch + landscape: the screen is too short for a column beside the D-pad, so the
    // emotes become a row along the top, left of the note display
    <div
      className={cn(
        HUD_SURFACE,
        "absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-0.5 rounded-container p-1 hud-compact:p-0.5 md:right-6 pointer-coarse:landscape:right-28 pointer-coarse:landscape:top-4 pointer-coarse:landscape:translate-y-0 pointer-coarse:landscape:flex-row",
      )}
    >
      {EMOTES.map((id, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onToggle(id)}
          title={`${i + 1} · ${copy.emotes[id]}`}
          aria-label={copy.emotes[id]}
          aria-pressed={emote === id}
          className={cn(
            HUD_FOCUS,
            // 12px corners inside the rail's 16px ones, 4px in: the curves stay concentric
            "flex size-10 select-none items-center justify-center rounded-card text-lg hud-compact:size-8 hud-compact:text-base leading-none transition-[background-color,box-shadow,scale] duration-150 hover:bg-muted active:scale-[0.94] motion-reduce:transition-none motion-reduce:active:scale-100",
            // the one you're doing is pressed in, like a held key
            emote === id && "bg-muted shadow-[inset_0_1px_2px_var(--palette-gray-alpha-500)] ring-1 ring-inset ring-foreground/25",
          )}
        >
          {EMOTE_ICON[id]}
        </button>
      ))}
    </div>
  );
}

/** Lines from NPCs, the cat, the jukebox… */
export function SpeechBubble({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute bottom-[5.25rem] pointer-coarse:bottom-[16.5rem] pointer-coarse:landscape:bottom-[5.25rem] left-1/2 w-max max-w-[min(26rem,calc(100%-2rem))] -translate-x-1/2"
    >
      {/* keyed by the line, so each new one arrives rather than swapping in place */}
      <div
        key={text}
        className={cn(
          HUD_SURFACE,
          HUD_ENTER,
          // Korean breaks between words, and the lines come out even: no last syllable left alone
          "relative text-balance break-keep rounded-container px-4 py-2.5 text-center text-sm leading-relaxed text-foreground",
        )}
      >
        {/* The tail points up, at whoever spoke in the world; down would point at the "E" prompt beneath. */}
        <span
          aria-hidden
          className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 rounded-tl-[3px] border-l border-t border-border bg-card"
        />
        {text}
      </div>
    </div>
  );
}

/**
 * The bottom-centre action: a keycap (hidden on touch, where the pill itself
 * is the button) and what pressing it does.
 */
function ActionPrompt({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={cn(
        HUD_CHIP,
        HUD_PRESSABLE,
        HUD_ENTER,
        "absolute bottom-6 pointer-coarse:bottom-[12.75rem] pointer-coarse:landscape:bottom-6 left-1/2 flex h-10 -translate-x-1/2 items-center gap-2 whitespace-nowrap pl-2.5 pr-4 text-sm font-semibold text-foreground pointer-coarse:h-11 pointer-coarse:pl-4",
      )}
    >
      <kbd className="flex h-6 min-w-6 items-center justify-center rounded-md border border-control-border bg-background px-1.5 font-sans text-xs font-semibold text-muted-foreground shadow-[0_1px_0_var(--palette-gray-alpha-400)] pointer-coarse:hidden">
        E
      </kbd>
      {children}
    </button>
  );
}

/** "E — Pet the cat": also a tap target on touch screens. */
export function InteractPrompt({
  nearby,
  onInteract,
  copy,
}: {
  nearby: InteractableId | null;
  onInteract: (id: InteractableId) => void;
  copy: PianoWorldCopy;
}) {
  if (!nearby) return null;
  return <ActionPrompt onPress={() => onInteract(nearby)}>{copy.interact[nearby]}</ActionPrompt>;
}

/** "E — Warp": shown at a warp stone. */
export function WarpPrompt({ onUse, copy }: { onUse: () => void; copy: PianoWorldCopy }) {
  return <ActionPrompt onPress={onUse}>{copy.warpUse}</ActionPrompt>;
}
