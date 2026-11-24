"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ChevronsUp } from "lucide-react";
import type { Direction } from "../../engine/physics";

const PAD_BUTTON =
  "flex size-12 touch-none select-none items-center justify-center rounded-xl border border-border bg-card/90 text-foreground shadow-sm active:bg-muted";

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
        className="absolute bottom-6 right-48 hidden size-14 touch-none select-none items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm active:bg-muted pointer-coarse:flex"
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
