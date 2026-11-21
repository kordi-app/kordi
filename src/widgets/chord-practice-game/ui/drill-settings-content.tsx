"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { CHORD_TEMPLATES, ALL_KEYS, displaySuffix, type ChordType } from "@/shared/lib/music";
import {
  DIFFICULTY_CHORD_TYPES,
  type DrillSettings,
  type Difficulty,
  type TimeSignature,
  type GameMode,
} from "@/entities/chord-practice";
import { MonoPill } from "@/shared/ui/mono-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { PillGroup, SettingsSection, Toggle } from "./settings-controls";

const GAME_MODES: readonly GameMode[] = ["practice", "timeattack"];
const DIFFICULTIES: readonly Difficulty[] = ["beginner", "intermediate", "advanced", "expert", "custom"];
const TIME_SIGNATURES: readonly TimeSignature[] = ["4/4", "3/4", "2/4", "6/8"];
const BARS_PER_CHORD = [1, 2, 3, 4] as const;
const ALL_CHORD_TYPES = Object.keys(CHORD_TEMPLATES) as ChordType[];
const ANY_KEY = "any";

type TFn = (key: string) => string;

interface DrillSettingsContentProps {
  ns: string;
  settings: DrillSettings;
  onChange: (settings: DrillSettings) => void;
}

export function DrillSettingsContent({
  ns,
  settings,
  onChange,
}: DrillSettingsContentProps) {
  const t = useTranslations(ns);
  const update = (partial: Partial<DrillSettings>) =>
    onChange({ ...settings, ...partial });
  const isPractice = settings.gameMode === "practice";

  const changeDifficulty = (difficulty: Difficulty) =>
    update({
      difficulty,
      customChordTypes:
        difficulty === "custom"
          ? settings.customChordTypes
          : DIFFICULTY_CHORD_TYPES[difficulty],
    });

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection label={t("gameMode")}>
        <PillGroup
          options={GAME_MODES}
          value={settings.gameMode}
          onChange={(gameMode) => update({ gameMode })}
          renderLabel={(mode) => t(`mode_${mode}`)}
        />
      </SettingsSection>

      <SettingsSection label={t("difficulty")}>
        <PillGroup
          wrap
          options={DIFFICULTIES}
          value={settings.difficulty}
          onChange={changeDifficulty}
          renderLabel={(difficulty) => t(`difficulty_${difficulty}`)}
        />
      </SettingsSection>

      {settings.difficulty === "custom" ? (
        <SettingsSection label={t("chordTypes")}>
          <CustomChordTypes
            selected={settings.customChordTypes}
            onChange={(customChordTypes) => update({ customChordTypes })}
          />
        </SettingsSection>
      ) : null}

      <SettingsSection label={t("key")}>
        <KeySelect
          t={t}
          value={settings.keyFilter ?? ANY_KEY}
          onChange={(key) => update({ keyFilter: key === ANY_KEY ? null : key })}
        />
      </SettingsSection>

      {!isPractice ? (
        <>
          <SettingsSection
            label={
              <>
                {t("tempo")}:{" "}
                <span className="font-heading text-sm text-foreground tabular-nums">
                  {settings.bpm}
                </span>{" "}
                BPM
              </>
            }
          >
            <input
              type="range"
              min={40}
              max={200}
              value={settings.bpm}
              onChange={(e) => update({ bpm: Number(e.target.value) })}
              className="w-full accent-foreground"
            />
          </SettingsSection>

          <SettingsSection label={t("barsPerChord")}>
            <PillGroup
              options={BARS_PER_CHORD}
              value={settings.barsPerChord as (typeof BARS_PER_CHORD)[number]}
              onChange={(barsPerChord) => update({ barsPerChord })}
            />
          </SettingsSection>

          <SettingsSection label={t("timeSignature")}>
            <PillGroup
              options={TIME_SIGNATURES}
              value={settings.timeSignature}
              onChange={(timeSignature) => update({ timeSignature })}
            />
          </SettingsSection>
        </>
      ) : null}

      <div className="flex flex-col gap-3">
        {!isPractice ? (
          <>
            <Toggle
              label={t("metronomeAudio")}
              checked={settings.metronomeAudioEnabled}
              onChange={(metronomeAudioEnabled) => update({ metronomeAudioEnabled })}
            />
            <Toggle
              label={t("metronomeVisual")}
              checked={settings.metronomeVisualEnabled}
              onChange={(metronomeVisualEnabled) => update({ metronomeVisualEnabled })}
            />
          </>
        ) : null}
        <Toggle
          label={t("showNextChord")}
          checked={settings.showNextChord}
          onChange={(showNextChord) => update({ showNextChord })}
        />
      </div>
    </div>
  );
}

/** Multi-select of chord types; at least one must stay selected. */
function CustomChordTypes({
  selected,
  onChange,
}: {
  selected: ChordType[];
  onChange: (next: ChordType[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_CHORD_TYPES.map((type) => {
        const isSelected = selected.includes(type);
        return (
          <MonoPill
            key={type || "major"}
            active={isSelected}
            className="normal-case tracking-normal"
            onClick={() => {
              const next = isSelected
                ? selected.filter((ct) => ct !== type)
                : [...selected, type];
              if (next.length > 0) onChange(next);
            }}
          >
            {type === "" ? "M" : displaySuffix(type)}
          </MonoPill>
        );
      })}
    </div>
  );
}

function KeySelect({
  t,
  value,
  onChange,
}: {
  t: TFn;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted data-[popup-open]:bg-primary data-[popup-open]:text-primary-foreground">
        <span>{value === ANY_KEY ? t("anyKey") : value}</span>
        <ChevronDown className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-(--anchor-width) overflow-y-auto">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          <DropdownMenuRadioItem value={ANY_KEY}>{t("anyKey")}</DropdownMenuRadioItem>
          {ALL_KEYS.map((k) => (
            <DropdownMenuRadioItem key={k.name} value={k.name}>
              {k.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
