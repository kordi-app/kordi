import { cn } from "@/shared/lib/utils";

interface KordiLogoProps {
  className?: string;
  /** Rendered size in px. Drawn on a 24-unit grid, so it scales cleanly. */
  size?: number;
}

/** Squircle plate with the white-key block knocked out of it (evenodd). */
const PLATE =
  "M7.6 0h8.8C20.6 0 24 3.4 24 7.6v8.8c0 4.2-3.4 7.6-7.6 7.6H7.6C3.4 24 0 20.6 0 16.4V7.6C0 3.4 3.4 0 7.6 0z " +
  "M6.7 8c-.77 0-1.4.63-1.4 1.4v5.2c0 .77.63 1.4 1.4 1.4h10.6c.77 0 1.4-.63 1.4-1.4V9.4c0-.77-.63-1.4-1.4-1.4H6.7z";

/** The two black keys, hanging from the top edge of the white-key block. */
const KEYS =
  "M8.8 8h2.6v4.2a1.3 1.3 0 0 1-2.6 0V8z M12.6 8h2.6v4.2a1.3 1.3 0 0 1-2.6 0V8z";

/**
 * The kordi mark: a soft squircle holding the two-black-key motif — the same
 * shape on the mascot's belly, so the geometric mark and the character read as
 * one brand.
 *
 * Everything is painted in `currentColor` and the keyboard is a knockout rather
 * than a second fill, so the mark inherits text color and stays correct on
 * cream, on charcoal, and inside a filled button. Key widths are set to survive
 * at 16px — thinner bars disappear at nav size.
 */
export function KordiLogo({ className, size = 28 }: KordiLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="kordi"
      className={cn("shrink-0", className)}
    >
      <path fillRule="evenodd" clipRule="evenodd" d={PLATE} fill="currentColor" />
      <path d={KEYS} fill="currentColor" />
    </svg>
  );
}
