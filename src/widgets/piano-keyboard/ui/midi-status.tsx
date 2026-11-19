"use client";

import { cn } from "@/shared/lib/utils";

interface MidiDeviceOption {
  id: string;
  name: string;
}

interface MidiStatusProps {
  midiName: string | undefined;
  fallback: string;
  devices?: MidiDeviceOption[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (id: string) => void;
  /**
   * Inline renders just the pill, for callers that place it in their own
   * toolbar. The default wraps it in a right-aligned row.
   */
  inline?: boolean;
}

const PILL =
  "flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground";

/** Connection indicator. Green only when a device is live — the one place the success colour means "online". */
export function MidiStatus({
  midiName,
  fallback,
  devices,
  selectedDeviceId,
  onSelectDevice,
  inline = false,
}: MidiStatusProps) {
  const showSelector =
    devices && devices.length > 1 && onSelectDevice !== undefined;
  const connected = Boolean(midiName) || Boolean(showSelector);

  const dot = (
    <span
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        connected ? "bg-success" : "bg-foreground/25",
      )}
    />
  );

  const pill = showSelector ? (
    <label className={PILL}>
      {dot}
      <select
        value={selectedDeviceId ?? ""}
        onChange={(e) => onSelectDevice(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent font-medium outline-none"
        aria-label="MIDI device"
      >
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
    </label>
  ) : (
    <span className={cn(PILL, !connected && "text-muted-foreground")}>
      {dot}
      <span className={connected ? "font-medium" : undefined}>
        {midiName ?? fallback}
      </span>
    </span>
  );

  if (inline) return pill;

  return <div className="mb-2 flex w-full max-w-4xl justify-end">{pill}</div>;
}
