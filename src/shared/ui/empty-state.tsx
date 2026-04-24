import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  label: string;
  hint?: string;
}

/**
 * Centered icon-on-bordered-tile + label pattern used by empty collections
 * (no friends, no scores, no ranking entries, etc.).
 */
export function EmptyState({ icon, label, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg border border-black bg-white">
        {icon}
      </div>
      <p className="text-sm font-semibold text-black">{label}</p>
      {hint ? <p className="text-xs opacity-60">{hint}</p> : null}
    </div>
  );
}

export function LoadingState({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm opacity-60">
      <svg
        className="size-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="16 40"
        />
      </svg>
      {label ? <span>{label}</span> : null}
    </div>
  );
}
