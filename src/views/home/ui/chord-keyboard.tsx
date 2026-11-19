const OCTAVES = 2;
const WHITE_W = 22;
const WHITE_H = 92;
const BLACK_W = 13;
const BLACK_H = 56;
const PAD = 1;

/** Semitone → index among the octave's white keys (black keys map to the key on their left). */
const WHITE_INDEX = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

interface ChordKeyboardProps {
  /** Semitone positions (0 = first C) to mark. */
  positions: number[];
  label: string;
}

/**
 * Two-octave keyboard diagram with the chord tones marked by dots — the
 * notation people already know from chord books, rather than filled bars that
 * do not read as keys.
 */
export function ChordKeyboard({ positions, label }: ChordKeyboardProps) {
  const marked = new Set(positions);
  const semitones = Array.from({ length: OCTAVES * 12 }, (_, i) => i);
  const whiteCount = OCTAVES * 7;
  const width = whiteCount * WHITE_W + PAD * 2;
  const height = WHITE_H + PAD * 2;

  const whiteX = (s: number) =>
    PAD + (Math.floor(s / 12) * 7 + WHITE_INDEX[s % 12]) * WHITE_W;
  const blackX = (s: number) => whiteX(s) + WHITE_W - BLACK_W / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full"
      role="img"
      aria-label={label}
    >
      {semitones
        .filter((s) => !IS_BLACK[s % 12])
        .map((s) => (
          <g key={s}>
            <rect
              x={whiteX(s)}
              y={PAD}
              width={WHITE_W}
              height={WHITE_H}
              rx={3}
              fill="var(--card)"
              stroke="var(--outline)"
              strokeOpacity={0.45}
            />
            {marked.has(s) ? (
              <circle
                cx={whiteX(s) + WHITE_W / 2}
                cy={WHITE_H - 14}
                r={6}
                fill="var(--foreground)"
              />
            ) : null}
          </g>
        ))}
      {semitones
        .filter((s) => IS_BLACK[s % 12])
        .map((s) => (
          <g key={s}>
            <rect
              x={blackX(s)}
              y={PAD}
              width={BLACK_W}
              height={BLACK_H}
              rx={2}
              fill="var(--foreground)"
            />
            {marked.has(s) ? (
              <circle
                cx={blackX(s) + BLACK_W / 2}
                cy={BLACK_H - 11}
                r={4.5}
                fill="var(--card)"
              />
            ) : null}
          </g>
        ))}
    </svg>
  );
}
