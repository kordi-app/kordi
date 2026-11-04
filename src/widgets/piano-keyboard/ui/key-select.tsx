"use client";

import { ChevronDown } from "lucide-react";
import { ALL_KEYS, type KeySignature } from "@/shared/lib/music";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

const AUTO = "auto";

interface KeySelectProps {
  value: KeySignature | null;
  onChange: (key: KeySignature | null) => void;
  label: string;
  autoLabel: string;
}

export function KeySelect({ value, onChange, label, autoLabel }: KeySelectProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-semibold opacity-60">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex min-w-32 cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted data-[popup-open]:bg-primary data-[popup-open]:text-primary-foreground"
        >
          <span>{value?.name ?? autoLabel}</span>
          <ChevronDown className="size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-(--anchor-width) overflow-y-auto">
          <DropdownMenuRadioGroup
            value={value?.name ?? AUTO}
            onValueChange={(name) => onChange(ALL_KEYS.find((k) => k.name === name) ?? null)}
          >
            <DropdownMenuRadioItem value={AUTO}>{autoLabel}</DropdownMenuRadioItem>
            {ALL_KEYS.map((k) => (
              <DropdownMenuRadioItem key={k.name} value={k.name}>
                {k.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
