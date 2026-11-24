/** Text fields and other form controls: every key belongs to them. */
export function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Controls that Space/Enter activate (buttons, links, ARIA widgets, form controls). */
function isActivatableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (isTypingTarget(target)) return true;
  return target.closest("button, a[href], summary, [role]:not([role='presentation']):not([role='none'])") !== null;
}

/**
 * Whether a global key shortcut (notes, world movement, sustain) should leave this key
 * alone: shortcuts with a modifier belong to the browser/OS, keys typed into a field
 * belong to the field, and Space/Enter on a focused control activate that control
 * (taking them would trap keyboard users).
 */
export function shouldIgnoreKey(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return true;
  if (isTypingTarget(e.target)) return true;
  if ((e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") && isActivatableTarget(e.target)) return true;
  return false;
}
