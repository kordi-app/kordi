import { cn } from "@/shared/lib/utils";

/**
 * A round initial avatar with a soft colour picked from the nickname, so a
 * list of friends doesn't read as a column of identical dots. The same name
 * always gets the same colour.
 */
/** Avatar tints from the design tokens (--avatar-1 … --avatar-6). Full class names, so Tailwind sees them. */
const TONES = [
  "bg-avatar-1 text-avatar-1-foreground",
  "bg-avatar-2 text-avatar-2-foreground",
  "bg-avatar-3 text-avatar-3-foreground",
  "bg-avatar-4 text-avatar-4-foreground",
  "bg-avatar-5 text-avatar-5-foreground",
  "bg-avatar-6 text-avatar-6-foreground",
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
        "flex size-10 shrink-0 items-center justify-center rounded-full text-t5 font-semibold",
        muted ? "bg-muted text-muted-foreground" : tone,
      )}
    >
      {[...name][0]?.toUpperCase()}
    </span>
  );
}
