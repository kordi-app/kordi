const WHITE_KEY_COUNT = 7;
const BLACK_KEY_POSITIONS = [0, 1, 3, 4, 5];

export function PianoKeysIllustration() {
  return (
    <svg
      viewBox="0 0 280 160"
      className="h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: WHITE_KEY_COUNT }, (_, i) => (
        <rect
          key={`w-${i}`}
          x={i * 38 + 8}
          y={12}
          width={36}
          height={136}
          fill="#ffffff"
          stroke="#000000"
          strokeWidth={1}
          rx={2}
        />
      ))}
      {BLACK_KEY_POSITIONS.map((i) => (
        <rect
          key={`b-${i}`}
          x={i * 38 + 32}
          y={12}
          width={24}
          height={84}
          fill="#000000"
          stroke="#000000"
          strokeWidth={1}
          rx={2}
        />
      ))}
    </svg>
  );
}
