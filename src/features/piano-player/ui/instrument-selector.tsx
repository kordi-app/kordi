"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  INSTRUMENTS,
  loadInstrument,
  getCurrentInstrumentId,
  type InstrumentId,
} from "@/shared/lib/audio";
import { cn } from "@/shared/lib/utils";

export function InstrumentSelector() {
  const t = useTranslations("instruments");
  const [activeId, setActiveId] = useState<InstrumentId>(
    getCurrentInstrumentId() ?? "piano"
  );
  const [loading, setLoading] = useState(false);

  const handleSelect = useCallback(
    async (id: InstrumentId) => {
      if (id === activeId) return;
      setLoading(true);
      try {
        await loadInstrument(id);
        setActiveId(id);
      } catch {
        // a failed load keeps the previous instrument playing; nothing to restore
        toast.error(t("loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [activeId, t]
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {INSTRUMENTS.map(({ id, labelKey }) => (
        <button
          key={id}
          disabled={loading}
          onClick={() => handleSelect(id)}
          className={cn(
            "rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
            id === activeId
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground hover:bg-muted",
            loading && "cursor-wait opacity-50"
          )}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
