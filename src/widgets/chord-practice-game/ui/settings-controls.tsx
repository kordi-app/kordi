"use client";

import type { ReactNode } from "react";
import { MonoPill } from "@/shared/ui/mono-button";

/** Labelled settings block. */
export function SettingsSection({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 block text-[11px] font-semibold uppercase tracking-widest opacity-70">
        {label}
      </div>
      {children}
    </div>
  );
}

/** Single-choice row of pills. */
export function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
  renderLabel = (option) => String(option),
  wrap = false,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  renderLabel?: (option: T) => ReactNode;
  wrap?: boolean;
}) {
  return (
    <div className={wrap ? "flex flex-wrap gap-1.5" : "flex gap-1.5"}>
      {options.map((option) => (
        <MonoPill
          key={option}
          active={value === option}
          onClick={() => onChange(option)}
        >
          {renderLabel(option)}
        </MonoPill>
      ))}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between text-sm font-semibold text-foreground">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-foreground"
      />
    </label>
  );
}
