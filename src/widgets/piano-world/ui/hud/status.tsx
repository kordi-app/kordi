"use client";

import { midiToNoteName } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";
import type { PianoWorldCopy } from "../../model/copy";
import type { RegionDef } from "../../model/regions";
import type { PresenceInfo } from "../../lib/use-world-presence";
import type { AudioState } from "../../lib/use-world-audio";

const CHIP = "rounded-full border border-border bg-card/90 shadow-sm";
const MAX_LISTED = 8;

/** Top-left: where you are, and what this place is about. */
export function RegionLabel({ region, copy }: { region: RegionDef; copy: PianoWorldCopy }) {
  const feature = region.feature === "melody" || region.feature === "course" ? null : region.feature;
  return (
    <div className="pointer-events-none absolute left-0 top-0 p-5 md:p-6">
      <div className={cn(CHIP, "px-3.5 py-1.5 text-sm font-medium text-foreground")}>
        {copy.regions[region.id]}
      </div>
      {feature ? (
        <p className="mt-2 max-w-60 rounded-lg border border-border bg-card/85 px-3 py-1.5 text-xs text-muted-foreground">
          {copy.features[feature]}
        </p>
      ) : null}
    </div>
  );
}

/** Top-right: the note you're standing on. */
export function NoteDisplay({ note }: { note: number | null }) {
  return (
    <div className="pointer-events-none absolute right-0 top-0 p-5 md:p-6">
      <div
        aria-live="polite"
        className={cn(
          "min-w-16 rounded-xl border border-border bg-card/90 px-4 py-2 text-center text-3xl font-semibold tabular-nums text-foreground shadow-sm transition-opacity",
          note === null && "opacity-0",
        )}
      >
        {note !== null ? midiToNoteName(note) : "–"}
      </div>
    </div>
  );
}

/** Who else is here: channel, people in it, and everyone online. */
function PresencePanel({ info, copy }: { info: PresenceInfo; copy: PianoWorldCopy }) {
  if (info.status === "disabled") return null;
  if (info.status !== "online") {
    const label =
      info.status === "full" ? copy.full : info.status === "offline" ? copy.offline : copy.connecting;
    return <div className={cn(CHIP, "px-3 py-1 text-xs text-muted-foreground shadow-none")}>{label}</div>;
  }
  const listed = info.others.slice(0, MAX_LISTED);
  const hidden = info.others.length - listed.length;
  return (
    <div className="max-w-64 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs shadow-sm">
      <div className="flex items-center gap-2 text-foreground">
        <span className="size-1.5 rounded-full bg-success" />
        <span className="font-medium">{copy.channel.replace("{channel}", String(info.channel ?? ""))}</span>
        <span className="text-muted-foreground">
          {copy.online.replace("{count}", info.online.toLocaleString())}
        </span>
      </div>
      {listed.length > 0 ? (
        <p className="mt-1 truncate text-muted-foreground">
          {listed.map((p) => p.name).join(", ")}
          {hidden > 0 ? ` +${hidden}` : ""}
        </p>
      ) : null}
    </div>
  );
}

/** Bottom-left: who's around, and whether sound is on. */
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
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-start gap-2 md:bottom-5 md:left-6">
      <PresencePanel info={info} copy={copy} />
      <div className={cn(CHIP, "flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground shadow-none")}>
        <span className={cn("size-1.5 rounded-full", audio === "on" ? "bg-success" : "bg-foreground/25")} />
        {audioLabel}
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
    <div className="absolute right-5 top-24 hidden md:block">
      <button
        type="button"
        disabled={!isGuest}
        onClick={onReroll}
        title={isGuest ? copy.nameReroll : undefined}
        className={cn(CHIP, "px-3 py-1 text-xs text-foreground enabled:hover:bg-muted")}
      >
        <span className="text-muted-foreground">{copy.nameLabel}</span> {name}
        {isGuest ? <span className="ml-1.5 text-muted-foreground">↻</span> : null}
      </button>
    </div>
  );
}
