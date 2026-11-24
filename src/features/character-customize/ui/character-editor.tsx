"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ACCESSORY_IDS,
  BODY_COLORS,
  BODY_IDS,
  FACE_IDS,
  HAT_IDS,
  PET_IDS,
  isRewardAccessory,
  isRewardHat,
  characterQueries,
  type Appearance,
  type MyCharacter,
} from "@/entities/character";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { updateCharacter } from "../api/update-character";

// three.js and WebGL: load on the client only, after the editor, like the home world
const CharacterPreview = dynamic(() => import("./character-preview").then((m) => m.CharacterPreview), {
  ssr: false,
  loading: () => <Skeleton className="aspect-square w-full rounded-2xl" />,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Choice({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** The editor itself, once the saved look has loaded: edits a local draft until saved. */
function Editor({ saved }: { saved: MyCharacter }) {
  const t = useTranslations("character");
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Appearance>(saved.appearance);
  const unlocked = new Set(saved.unlocked);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.appearance);
  const earnedPets = PET_IDS.filter((pet) => unlocked.has(pet));

  const { mutate, isPending } = useMutation({
    mutationFn: updateCharacter,
    onSuccess: (next) => {
      queryClient.setQueryData(characterQueries.me().queryKey, next);
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("saveFailed")),
  });

  const set = (patch: Partial<Appearance>) => setDraft((current) => ({ ...current, ...patch }));

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
      <div className="flex flex-col gap-3">
        <CharacterPreview appearance={draft} />
        <p className="text-center text-xs text-muted-foreground">{t("dragHint")}</p>
      </div>

      <div className="flex flex-col gap-7">
        <Section title={t("sections.body")}>
          {BODY_IDS.map((body) => (
            <button
              key={body}
              type="button"
              aria-pressed={draft.body === body}
              aria-label={t(`body.${body}`)}
              title={t(`body.${body}`)}
              onClick={() => set({ body })}
              className={cn(
                "size-9 rounded-full border-2 transition-transform hover:scale-105",
                draft.body === body ? "border-foreground" : "border-border",
              )}
              style={{ backgroundColor: BODY_COLORS[body] }}
            />
          ))}
        </Section>

        <Section title={t("sections.hat")}>
          <Choice selected={draft.hat === null} onSelect={() => set({ hat: null })}>
            {t("none")}
          </Choice>
          {/* course reward hats only appear once you've earned them */}
          {HAT_IDS.filter((hat) => !isRewardHat(hat) || unlocked.has(hat)).map((hat) => (
            <Choice key={hat} selected={draft.hat === hat} onSelect={() => set({ hat })}>
              {t(`hat.${hat}`)}
            </Choice>
          ))}
        </Section>

        <Section title={t("sections.face")}>
          {FACE_IDS.map((face) => (
            <Choice key={face} selected={draft.face === face} onSelect={() => set({ face })}>
              {t(`face.${face}`)}
            </Choice>
          ))}
        </Section>

        <Section title={t("sections.accessory")}>
          <Choice selected={draft.accessory === null} onSelect={() => set({ accessory: null })}>
            {t("none")}
          </Choice>
          {/* found accessories (the cave's necklace) only appear once you have them */}
          {ACCESSORY_IDS.filter((accessory) => !isRewardAccessory(accessory) || unlocked.has(accessory)).map((accessory) => (
            <Choice key={accessory} selected={draft.accessory === accessory} onSelect={() => set({ accessory })}>
              {t(`accessory.${accessory}`)}
            </Choice>
          ))}
        </Section>

        {/* every pet is a secret: nothing here (not even a hint) until you've found one */}
        {earnedPets.length > 0 ? (
          <Section title={t("sections.pet")}>
            <Choice selected={!draft.pet} onSelect={() => set({ pet: null })}>
              {t("none")}
            </Choice>
            {earnedPets.map((pet) => (
              <Choice key={pet} selected={draft.pet === pet} onSelect={() => set({ pet })}>
                {t(`pet.${pet}`)}
              </Choice>
            ))}
          </Section>
        ) : null}

        <div className="flex gap-2">
          <Button type="button" disabled={!dirty || isPending} onClick={() => mutate(draft)}>
            {t("save")}
          </Button>
          <Button type="button" variant="outline" disabled={!dirty || isPending} onClick={() => setDraft(saved.appearance)}>
            {t("reset")}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Dress Kordi: body colour, hat (including course rewards), face and accessory. */
export function CharacterEditor() {
  const t = useTranslations("character");
  const { data, isError } = useQuery(characterQueries.me());
  if (isError) return <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>;
  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }
  // remount when the saved look changes underneath (e.g. a crown just won in the world)
  return <Editor key={JSON.stringify(data)} saved={data} />;
}
