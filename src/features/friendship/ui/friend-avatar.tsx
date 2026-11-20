import { cn } from "@/shared/lib/utils";

/**
 * A round initial avatar with a soft colour picked from the nickname, so a
 * list of friends doesn't read as a column of identical dots. The same name
 * always gets the same colour.
 */
const TONES = [
  { bg: "#fde2d4", fg: "#9a4a2a" },
  { bg: "#d9ecf8", fg: "#2c5f82" },
  { bg: "#dcefe3", fg: "#2f6a47" },
  { bg: "#f6e3f0", fg: "#8a3a6e" },
  { bg: "#fbf0c8", fg: "#7a5c12" },
  { bg: "#e6e1f8", fg: "#4d3f8f" },
] as const;

function toneOf(name: string) {
  let hash = 2166136261; // FNV-1a: spreads similar names across the palette
  for (const ch of name) hash = Math.imul(hash ^ ch.codePointAt(0)!, 16777619) >>> 0;
  return TONES[hash % TONES.length];
}

export function FriendAvatar({ name, muted = false }: { name: string; muted?: boolean }) {
  const tone = toneOf(name);
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold",
        muted && "bg-muted text-muted-foreground",
      )}
      style={muted ? undefined : { backgroundColor: tone.bg, color: tone.fg }}
    >
      {[...name][0]?.toUpperCase()}
    </span>
  );
}
