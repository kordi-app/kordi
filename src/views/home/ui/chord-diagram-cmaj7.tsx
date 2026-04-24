const KEYS = [0, 1, 2, 3, 4, 5, 6];
const HIGHLIGHTED = [0, 2, 4, 6];

export function ChordDiagramCmaj7() {
  return (
    <svg viewBox="0 0 160 72" className="h-full w-full" aria-hidden="true">
      {KEYS.map((i) => (
        <rect
          key={i}
          x={i * 22 + 4}
          y={4}
          width={20}
          height={64}
          fill={HIGHLIGHTED.includes(i) ? "#000" : "#fff"}
          stroke="#000"
          strokeWidth={1}
          rx={1}
        />
      ))}
    </svg>
  );
}
