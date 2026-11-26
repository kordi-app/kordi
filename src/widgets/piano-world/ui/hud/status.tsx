"use client";

import { MapPin, Volume2, VolumeX } from "lucide-react";
import { useStoreValue, type ValueStore } from "@/shared/lib/react/value-store";
import { cn } from "@/shared/lib/utils";
import type { PianoWorldCopy } from "../copy";
import type { RegionDef } from "../../engine/regions";
import type { PresenceInfo } from "../../net/use-world-presence";
import type { AudioState } from "../../audio/use-world-audio";
import { HUD_CARD, HUD_CHIP, HUD_PRESSABLE } from "./surface";

const MAX_LISTED = 8;

/** The quiet chips of the bottom-left stack: one height, one type size */
const STATUS_CHIP = cn(HUD_CHIP, "flex h-7 items-center gap-1.5 px-3 text-xs text-muted-foreground");

/** A state dot with a halo of its own colour, so it reads as a light and not a bullet */
function StatusDot({ tone }: { tone: "on" | "waiting" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full ring-2",
        tone === "on" ? "bg-success ring-success/20" : "bg-warning ring-warning/20",
      )}
    />
  );
}

/** Top-left: where you are. */
export function RegionLabel({ region, copy }: { region: RegionDef; copy: PianoWorldCopy }) {
  return (
    <div className="pointer-events-none absolute left-0 top-0 p-4 md:p-6">
      <div className={cn(HUD_CHIP, "flex h-9 items-center gap-1.5 pl-3 pr-4 text-sm font-semibold text-foreground")}>
        <MapPin aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        {/* its own element: playtests look for the place name as a whole text */}
        <span>{copy.regions[region.id]}</span>
      </div>
    </div>
  );
}

/** Top-right: the note you're standing on (or, where a band plays, the chord you just played). */
export function NoteDisplay({ store }: { store: ValueStore<string | null> }) {
  const note = useStoreValue(store);
  return (
    <div className="pointer-events-none absolute right-0 top-0 p-4 md:p-6">
      <div
        aria-live="polite"
        className={cn(
          HUD_CARD,
          "min-w-16 px-4 py-2 text-center text-3xl font-semibold hud-compact:min-w-12 hud-compact:px-3 hud-compact:py-1.5 hud-compact:text-2xl -tracking-[0.02em] tabular-nums text-foreground",
          // leaves the way it came: a small settle, not a pop
          "origin-top-right transition-[opacity,scale] duration-200 motion-reduce:transition-none",
          note === null && "scale-95 opacity-0 motion-reduce:scale-100",
        )}
      >
        {note ?? "–"}
      </div>
    </div>
  );
}

/** Who else is here: my channel and how many of us are in it (me included). */
function PresencePanel({ info, copy }: { info: PresenceInfo; copy: PianoWorldCopy }) {
  if (info.status === "disabled") return null;
  if (info.status !== "online") {
    const label =
      info.status === "full" ? copy.full : info.status === "offline" ? copy.offline : copy.connecting;
    return (
      // long on a phone ("…walking alone · reconnecting"): wrap inside the chip rather than run off the screen
      <div className={cn(STATUS_CHIP, "h-auto min-h-7 max-w-full py-1 leading-snug")}>
        <StatusDot tone="waiting" />
        <span className="min-w-0 break-keep">{label}</span>
      </div>
    );
  }
  const listed = info.others.slice(0, MAX_LISTED);
  const hidden = info.others.length - listed.length;
  return (
    <div className={cn(HUD_CARD, "max-w-64 px-3 py-2 text-xs")}>
      <div className="flex items-center gap-1.5 text-foreground">
        <StatusDot tone="on" />
        <span className="font-semibold">{copy.channel.replace("{channel}", String(info.channel ?? ""))}</span>
        <span className="text-muted-foreground">
          {copy.online.replace("{count}", (info.others.length + 1).toLocaleString())}
        </span>
      </div>
      {listed.length > 0 ? (
        <p className="mt-1 truncate text-muted-foreground hud-compact:hidden">
          {listed.map((p) => p.name).join(", ")}
          {hidden > 0 ? ` +${hidden}` : ""}
        </p>
      ) : null}
    </div>
  );
}

/** Bottom-left: who's around, and whether sound is on (lifted above the on-screen controls on touch). */
export function StatusStack({
  info,
  audio,
  copy,
}: {
  info: PresenceInfo;
  audio: AudioState;
  copy: PianoWorldCopy;
}) {
  const audioLabel = audio === "on" ? copy.soundOn : audio === "loading" ? copy.soundLoading : copy.soundOff;
  const AudioIcon = audio === "on" ? Volume2 : VolumeX;
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] flex-col items-start gap-1.5 md:bottom-6 md:left-6 pointer-coarse:bottom-32 pointer-coarse:landscape:bottom-4">
      <PresencePanel info={info} copy={copy} />
      <div className={cn(STATUS_CHIP, "hud-compact:px-2")}>
        <AudioIcon aria-hidden className={cn("size-3.5 shrink-0", audio === "on" && "text-success")} />
        {/* a phone keeps just the icon; the words stay for screen readers */}
        <span className="hud-compact:sr-only">{audioLabel}</span>
      </div>
    </div>
  );
}

/** My name — guests can re-roll it. */
export function NameChip({
  name,
  isGuest,
  onReroll,
  copy,
}: {
  name: string;
  isGuest: boolean;
  onReroll: () => void;
  copy: PianoWorldCopy;
}) {
  return (
    <div className="absolute right-4 top-20 md:right-6 md:top-[5.5rem]">
      <button
        type="button"
        disabled={!isGuest}
        onClick={onReroll}
        title={isGuest ? copy.nameReroll : undefined}
        className={cn(
          HUD_CHIP,
          HUD_PRESSABLE,
          "group relative flex h-7 items-center gap-1 px-3 text-xs text-foreground",
          // the chip stays small, but a finger gets a 44px-tall target
          "after:absolute after:-inset-x-1 after:-inset-y-2",
        )}
      >
        <span className="text-muted-foreground hud-compact:hidden">{copy.nameLabel}</span>{" "}
        <span className="font-medium">{name}</span>
        {isGuest ? (
          <span className="ml-0.5 text-muted-foreground transition-transform duration-300 group-hover:rotate-90 motion-reduce:transition-none">
            ↻
          </span>
        ) : null}
      </button>
    </div>
  );
}
