"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { shouldIgnoreKey } from "@/shared/lib/dom/should-ignore-key";
import { KEY_TO_DIRECTION, idleInput, type Direction, type InputState } from "../../engine/physics";

const EMOTE_KEYS = ["Digit1", "Digit2", "Digit3", "Digit4"];

interface ControlHandlers {
  /** first gesture: unlock audio */
  onGesture: () => void;
  /** E / Enter; return true if it did something (so the key is swallowed) */
  onInteract: () => boolean;
  /** 1–4 */
  onEmote: (index: number) => void;
  /** Escape; return true if it closed something */
  onEscape: () => boolean;
}

/**
 * Keyboard and touch input for the world. Movement keys are only captured
 * while the world is on screen (so arrows still scroll the page otherwise),
 * never while you're typing in a field, and Space/Enter never while a button
 * or link has focus.
 */
export function useWorldControls(handlers: ControlHandlers) {
  const input = useRef<InputState>(idleInput());
  const containerRef = useRef<HTMLDivElement>(null);
  // Assume visible until the observer reports otherwise, so the first frame always draws
  const visibleRef = useRef(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.intersectionRatio > 0.4;
        setVisible(entry.isIntersecting);
      },
      { threshold: [0, 0.4] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.code === "Escape" && handlers.onEscape()) return;
    // fields keep their keys, and Space/Enter on a focused button or link activate it
    if (shouldIgnoreKey(e) || !visibleRef.current) return;

    if (e.code === "KeyE" || e.code === "Enter") {
      if (handlers.onInteract()) e.preventDefault();
      return;
    }
    const emote = EMOTE_KEYS.indexOf(e.code);
    if (emote !== -1) {
      handlers.onEmote(emote);
      return;
    }
    if (e.code === "Space") {
      e.preventDefault(); // Space would otherwise scroll the page
      if (!e.repeat) input.current.jump = true;
      input.current.jumpHeld = true;
      handlers.onGesture();
      return;
    }
    const direction = KEY_TO_DIRECTION[e.code];
    if (!direction) return;
    e.preventDefault(); // arrows would otherwise scroll the page
    input.current[direction] = true;
    handlers.onGesture();
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => onKeyDown(e);
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") input.current.jumpHeld = false;
      const direction = KEY_TO_DIRECTION[e.code];
      if (direction) input.current[direction] = false;
    };
    const releaseAll = () => {
      input.current = idleInput();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", releaseAll);
    };
  }, []);

  /** Reads and clears a pending jump (called once per frame by the scene) */
  const takeJump = useCallback(() => {
    const requested = input.current.jump;
    input.current.jump = false;
    return requested;
  }, []);

  const { onGesture } = handlers;
  const pressDirection = useCallback(
    (direction: Direction, pressed: boolean) => {
      input.current[direction] = pressed;
      if (pressed) onGesture();
    },
    [onGesture],
  );
  /** Touch jump button: press starts the jump, holding makes it higher. */
  const pressJump = useCallback(
    (pressed: boolean) => {
      if (pressed) {
        input.current.jump = true;
        onGesture();
      }
      input.current.jumpHeld = pressed;
    },
    [onGesture],
  );

  return { input, containerRef, visible, takeJump, pressDirection, pressJump };
}
