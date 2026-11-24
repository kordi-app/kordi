import { isBlackKey } from "@/shared/lib/music";
import { cn } from "@/shared/lib/utils";

interface MiniKeyboardProps {
  startMidi: number;
  endMidi: number;
  /** keys that should have been played */
  target: readonly number[];
  /** keys that were played */
  played: readonly number[];
  className?: string;
}

const BLACK_OFFSETS: Record<number, number> = { 1: 0.6, 3: 0.8, 6: 0.6, 8: 0.7, 10: 0.8 };

/**
 * A small, display-only keyboard comparing two sets of keys: the ones asked
 * for (amber), the ones played (red), and the ones that were both (green).
 */
export function MiniKeyboard({ startMidi, endMidi, target, played, className }: MiniKeyboardProps) {
  const targetSet = new Set(target);
  const playedSet = new Set(played);
  const mark = (midi: number) =>
    targetSet.has(midi) && playedSet.has(midi)
      ? "both"
      : targetSet.has(midi)
        ? "target"
        : playedSet.has(midi)
          ? "played"
          : undefined;

  const whites: number[] = [];
  const blacks: { midi: number; whiteIndex: number }[] = [];
  for (let midi = startMidi; midi <= endMidi; midi++) {
    if (isBlackKey(midi)) blacks.push({ midi, whiteIndex: whites.length - 1 });
    else whites.push(midi);
  }

  return (
    <div aria-hidden className={cn("relative flex h-20 w-full select-none", className)}>
      {whites.map((midi) => (
        <div
          key={midi}
          data-mark={mark(midi)}
          className={cn(
            "h-full flex-1 rounded-b-sm border border-[oklch(0_0_0/10%)] bg-[oklch(0.97_0.012_85)] dark:bg-[oklch(0.92_0.005_75)]",
            "data-[mark=target]:bg-[oklch(0.88_0.09_80)] data-[mark=played]:bg-[oklch(0.82_0.09_25)] data-[mark=both]:bg-[oklch(0.85_0.08_150)]",
          )}
        />
      ))}
      {blacks.map(({ midi, whiteIndex }) => (
        <div
          key={midi}
          data-mark={mark(midi)}
          className={cn(
            "absolute top-0 h-[60%] rounded-b-sm bg-[oklch(0.22_0.01_75)]",
            "data-[mark=target]:bg-[oklch(0.6_0.13_70)] data-[mark=played]:bg-[oklch(0.5_0.15_25)] data-[mark=both]:bg-[oklch(0.45_0.1_150)]",
          )}
          style={{
            left: `${((whiteIndex + (BLACK_OFFSETS[midi % 12] ?? 0.65)) / whites.length) * 100}%`,
            width: `${(0.6 / whites.length) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}
