"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { CHORD_TEMPLATES, ALL_KEYS, type ChordType } from "@/shared/lib/music";
import {
  DIFFICULTY_CHORD_TYPES,
  type QuizSettings,
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

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced", "custom"];
const TIME_SIGNATURES: TimeSignature[] = ["4/4", "3/4", "2/4", "6/8"];
const ALL_CHORD_TYPES = Object.keys(CHORD_TEMPLATES) as ChordType[];

interface QuizSettingsContentProps {
  ns: string;
  settings: QuizSettings;
  onChange: (settings: QuizSettings) => void;
}

export function QuizSettingsContent({
  ns,
  settings,
  onChange,
}: QuizSettingsContentProps) {
  const t = useTranslations(ns);
  const update = (partial: Partial<QuizSettings>) =>
    onChange({ ...settings, ...partial });
  const isPractice = settings.gameMode === "practice";

  return (
    <div className="flex flex-col gap-5">
      <GameModeSection t={t} value={settings.gameMode} onChange={(m) => update({ gameMode: m })} />

      <DifficultySection
        t={t}
        difficulty={settings.difficulty}
        customChordTypes={settings.customChordTypes}
        onChange={(d) => {
          const types = d === "custom" ? settings.customChordTypes : DIFFICULTY_CHORD_TYPES[d];
          update({ difficulty: d, customChordTypes: types });
        }}
      />

      {settings.difficulty === "custom" && (
        <CustomChordTypesSection
          t={t}
          selected={settings.customChordTypes}
          onChange={(next) => update({ customChordTypes: next })}
        />
      )}

      <KeySection
        t={t}
        value={settings.keyFilter ?? "any"}
        onChange={(v) => update({ keyFilter: v === "any" ? null : v })}
      />

      {!isPractice && (
        <>
          <TempoSection t={t} bpm={settings.bpm} onChange={(bpm) => update({ bpm })} />
          <BarsPerChordSection
            t={t}
            value={settings.barsPerChord}
            onChange={(barsPerChord) => update({ barsPerChord })}
          />
          <TimeSignatureSection
            t={t}
            value={settings.timeSignature}
            onChange={(timeSignature) => update({ timeSignature })}
          />
        </>
      )}

      <TogglesSection
        t={t}
        isPractice={isPractice}
        settings={settings}
        onChange={update}
      />
    </div>
  );
}

type TFn = (key: string) => string;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest opacity-70">
      {children}
    </label>
  );
}

function Pill({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <MonoPill active={selected} onClick={onClick} className={className}>
      {children}
    </MonoPill>
  );
}

function GameModeSection({
  t,
  value,
  onChange,
}: {
  t: TFn;
  value: GameMode;
  onChange: (v: GameMode) => void;
}) {
  return (
    <div>
      <Label>{t("gameMode")}</Label>
      <div className="flex gap-1.5">
        {(["practice", "timeattack"] as GameMode[]).map((mode) => (
          <Pill key={mode} selected={value === mode} onClick={() => onChange(mode)}>
            {t(`mode_${mode}`)}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function DifficultySection({
  t,
  difficulty,
  onChange,
}: {
  t: TFn;
  difficulty: Difficulty;
  customChordTypes: ChordType[];
  onChange: (v: Difficulty) => void;
}) {
  return (
    <div>
      <Label>{t("difficulty")}</Label>
      <div className="flex flex-wrap gap-1.5">
        {DIFFICULTIES.map((d) => (
          <Pill key={d} selected={difficulty === d} onClick={() => onChange(d)}>
            {t(`difficulty_${d}`)}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function CustomChordTypesSection({
  t,
  selected,
  onChange,
}: {
  t: TFn;
  selected: ChordType[];
  onChange: (next: ChordType[]) => void;
}) {
  return (
    <div>
      <Label>{t("chordTypes")}</Label>
      <div className="flex flex-wrap gap-1.5">
        {ALL_CHORD_TYPES.map((type) => {
          const label = type === "" ? "Maj" : type;
          const isSelected = selected.includes(type);
          return (
            <Pill
              key={type || "major"}
              selected={isSelected}
              className="normal-case tracking-normal"
              onClick={() => {
                const next = isSelected
                  ? selected.filter((ct) => ct !== type)
                  : [...selected, type];
                if (next.length > 0) onChange(next);
              }}
            >
              {label}
            </Pill>
          );
        })}
      </div>
    </div>
  );
}

function KeySection({
  t,
  value,
  onChange,
}: {
  t: TFn;
  value: string;
  onChange: (v: string) => void;
}) {
  const displayLabel = value === "any" ? t("anyKey") : value;
  return (
    <div>
      <Label>{t("key")}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted data-[popup-open]:bg-primary data-[popup-open]:text-primary-foreground"
        >
          <span>{displayLabel}</span>
          <ChevronDown className="size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 w-(--anchor-width) overflow-y-auto">
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            <DropdownMenuRadioItem value="any">{t("anyKey")}</DropdownMenuRadioItem>
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

function TempoSection({
  t,
  bpm,
  onChange,
}: {
  t: TFn;
  bpm: number;
  onChange: (bpm: number) => void;
}) {
  return (
    <div>
      <Label>
        {t("tempo")}:{" "}
        <span className="font-heading text-sm text-foreground tabular-nums">{bpm}</span> BPM
      </Label>
      <input
        type="range"
        min={40}
        max={200}
        value={bpm}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-foreground"
      />
    </div>
  );
}

function BarsPerChordSection({
  t,
  value,
  onChange,
}: {
  t: TFn;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label>{t("barsPerChord")}</Label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <Pill key={n} selected={value === n} onClick={() => onChange(n)}>
            {n}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function TimeSignatureSection({
  t,
  value,
  onChange,
}: {
  t: TFn;
  value: TimeSignature;
  onChange: (v: TimeSignature) => void;
}) {
  return (
    <div>
      <Label>{t("timeSignature")}</Label>
      <div className="flex gap-1.5">
        {TIME_SIGNATURES.map((ts) => (
          <Pill key={ts} selected={value === ts} onClick={() => onChange(ts)}>
            {ts}
          </Pill>
        ))}
      </div>
    </div>
  );
}

function TogglesSection({
  t,
  isPractice,
  settings,
  onChange,
}: {
  t: TFn;
  isPractice: boolean;
  settings: QuizSettings;
  onChange: (partial: Partial<QuizSettings>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {!isPractice && (
        <>
          <Toggle
            label={t("metronomeAudio")}
            checked={settings.metronomeAudioEnabled}
            onChange={(v) => onChange({ metronomeAudioEnabled: v })}
          />
          <Toggle
            label={t("metronomeVisual")}
            checked={settings.metronomeVisualEnabled}
            onChange={(v) => onChange({ metronomeVisualEnabled: v })}
          />
        </>
      )}
      <Toggle
        label={t("showNextChord")}
        checked={settings.showNextChord}
        onChange={(v) => onChange({ showNextChord: v })}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
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
