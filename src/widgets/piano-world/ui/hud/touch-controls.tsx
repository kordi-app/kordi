"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsUp } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { Direction } from "../../engine/physics";
import { HUD_FOCUS, HUD_SURFACE } from "./surface";

/**
 * A pad key: held rather than clicked, so it answers the press at once (no
 * transition in) and stays sunk while it's down.
 */
const PAD_KEY = cn(
  HUD_SURFACE,
  HUD_FOCUS,
  "touch-none select-none items-center justify-center text-foreground active:scale-[0.94] active:bg-muted active:shadow-none motion-reduce:active:scale-100",
);
const PAD_BUTTON = cn(PAD_KEY, "flex size-12 rounded-card");

function DirectionButton({
  direction,
  onPress,
  children,
}: {
  direction: Direction;
  onPress: (direction: Direction, pressed: boolean) => void;
  children: ReactNode;
}) {
  const t = useTranslations("a11y");
  return (
    <button
      type="button"
      aria-label={t(direction)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onPress(direction, true);
      }}
      onPointerUp={() => onPress(direction, false)}
      onPointerCancel={() => onPress(direction, false)}
      onContextMenu={(e) => e.preventDefault()}
      className={PAD_BUTTON}
    >
      {children}
    </button>
  );
}

/** On-screen D-pad and jump button, shown only on touch (coarse pointer) devices. */
export function TouchControls({
  onDirection,
  onJump,
}: {
  onDirection: (direction: Direction, pressed: boolean) => void;
  onJump: (pressed: boolean) => void;
}) {
  const t = useTranslations("a11y");
  return (
    <>
      <button
        type="button"
        aria-label={t("jump")}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onJump(true);
        }}
        onPointerUp={() => onJump(false)}
        onPointerCancel={() => onJump(false)}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(PAD_KEY, "absolute bottom-6 right-48 hidden size-14 rounded-full pointer-coarse:flex")}
      >
        <ChevronsUp className="size-6" />
      </button>
      <div className="absolute bottom-4 right-4 hidden grid-cols-3 gap-1.5 pointer-coarse:grid">
        <span />
        <DirectionButton direction="up" onPress={onDirection}>
          <ArrowUp className="size-5" />
        </DirectionButton>
        <span />
        <DirectionButton direction="left" onPress={onDirection}>
          <ArrowLeft className="size-5" />
        </DirectionButton>
        <DirectionButton direction="down" onPress={onDirection}>
          <ArrowDown className="size-5" />
        </DirectionButton>
        <DirectionButton direction="right" onPress={onDirection}>
          <ArrowRight className="size-5" />
        </DirectionButton>
      </div>
    </>
  );
}
