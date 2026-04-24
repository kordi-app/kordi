"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { QuizSettings } from "@/entities/chord-quiz";
import { QuizSettingsContent } from "./quiz-settings-content";

interface QuizSettingsPanelProps {
  ns: string;
  settings: QuizSettings;
  onChange: (settings: QuizSettings) => void;
  onClose: () => void;
  isOpen: boolean;
  inline?: boolean;
}

export function QuizSettingsPanel({
  ns,
  settings,
  onChange,
  onClose,
  isOpen,
  inline = false,
}: QuizSettingsPanelProps) {
  const t = useTranslations(ns);

  if (!isOpen) return null;

  if (inline) {
    return (
      <div className="rounded-lg border border-black bg-white p-6">
        <h2 className="mb-4 font-heading text-lg font-bold uppercase text-black">
          {t("settings")}
        </h2>
        <QuizSettingsContent ns={ns} settings={settings} onChange={onChange} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 flex w-80 flex-col gap-6 overflow-y-auto border-l border-black bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold uppercase text-black">
            {t("settings")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-black bg-white p-1.5 text-black transition-colors hover:bg-black hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>
        <QuizSettingsContent ns={ns} settings={settings} onChange={onChange} />
      </aside>
    </div>
  );
}
