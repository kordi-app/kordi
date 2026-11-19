"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { DrillSettings } from "@/entities/chord-practice";
import { DrillSettingsContent } from "./drill-settings-content";

interface DrillSettingsPanelProps {
  ns: string;
  settings: DrillSettings;
  onChange: (settings: DrillSettings) => void;
  onClose: () => void;
  isOpen: boolean;
  inline?: boolean;
}

export function DrillSettingsPanel({
  ns,
  settings,
  onChange,
  onClose,
  isOpen,
  inline = false,
}: DrillSettingsPanelProps) {
  const t = useTranslations(ns);

  if (!isOpen) return null;

  if (inline) {
    return (
      <div
        className="rounded-lg border border-border bg-card p-6"
        style={{ width: "100%", display: "block" }}
      >
        <h2 className="mb-4 font-heading text-lg font-semibold uppercase text-foreground">
          {t("settings")}
        </h2>
        <DrillSettingsContent ns={ns} settings={settings} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex w-80 flex-col gap-6 overflow-y-auto border-l border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold uppercase text-foreground">
            {t("settings")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-card p-1.5 text-foreground transition-colors hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
        <DrillSettingsContent ns={ns} settings={settings} onChange={onChange} />
      </aside>
    </div>
  );
}
