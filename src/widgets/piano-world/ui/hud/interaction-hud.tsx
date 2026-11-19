"use client";

import { cn } from "@/shared/lib/utils";
import type { PianoWorldCopy } from "../../model/copy";
import { EMOTES, EMOTE_ICON, type EmoteId, type InteractableId } from "../../model/interactables";

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
    <div className="absolute right-5 top-1/2 flex -translate-y-1/2 flex-col gap-1.5">
      {EMOTES.map((id, i) => (
        <button
          key={id}
          type="button"
          onClick={() => onToggle(id)}
          title={`${i + 1} · ${copy.emotes[id]}`}
          aria-label={copy.emotes[id]}
          aria-pressed={emote === id}
          className={cn(
            "flex size-10 items-center justify-center rounded-xl border border-border bg-card/90 text-lg shadow-sm hover:bg-muted",
            emote === id && "ring-2 ring-foreground/30",
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
      className="pointer-events-none absolute bottom-24 left-1/2 max-w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-card/95 px-4 py-2.5 text-center text-sm text-foreground shadow-md"
    >
      {text}
    </div>
  );
}

/** "E — Pet the cat": also a tap target on touch screens. */
export function InteractPrompt({
  nearby,
  jukeboxPlaying,
  onInteract,
  copy,
}: {
  nearby: InteractableId | null;
  jukeboxPlaying: boolean;
  onInteract: (id: InteractableId) => void;
  copy: PianoWorldCopy;
}) {
  if (!nearby) return null;
  const label = copy.interact[nearby === "jukebox" && jukeboxPlaying ? "jukeboxStop" : nearby];
  return (
    <button
      type="button"
      onClick={() => onInteract(nearby)}
      className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-medium text-foreground shadow-md hover:bg-muted"
    >
      <kbd className="rounded border border-border bg-background px-1.5 text-xs text-muted-foreground pointer-coarse:hidden">
        E
      </kbd>
      {label}
    </button>
  );
}

/** "E — Warp": shown at a warp stone. */
export function WarpPrompt({ onUse, copy }: { onUse: () => void; copy: PianoWorldCopy }) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-medium text-foreground shadow-md hover:bg-muted"
    >
      <kbd className="rounded border border-border bg-background px-1.5 text-xs text-muted-foreground pointer-coarse:hidden">
        E
      </kbd>
      {copy.warpUse}
    </button>
  );
}
