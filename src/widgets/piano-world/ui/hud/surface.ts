/**
 * The HUD's shared look: every chip, card and button over the 3D world is the
 * same piece of cream paper, so the overlay reads as one set whether the scene
 * behind it is the island at noon or the cave.
 */

/**
 * The paper itself. Nearly opaque on purpose: the text on it must keep its
 * contrast over any scene, and a backdrop blur over a full-screen WebGL canvas
 * costs frames on phones. The lift is the cream system's shallow one — a light
 * hairline along the top edge, a tight contact shadow and a soft wide one —
 * which is what separates cream from the island's equally pale stone; on dark
 * scenes the fill alone does it.
 */
export const HUD_SURFACE =
  "border border-border bg-card/95 shadow-[inset_0_0.5px_0_rgba(255,255,255,0.7),0_1px_2px_var(--palette-gray-alpha-400),0_6px_16px_-6px_var(--palette-gray-alpha-500)]";

/** A pill: one short line (place name, my name, a status) */
export const HUD_CHIP = `${HUD_SURFACE} rounded-full`;

/** A card: several lines (progress, who's here, the note) */
export const HUD_CARD = `${HUD_SURFACE} rounded-container`;

/**
 * Keyboard focus. The ink ring shows on bright scenes; the cream offset around
 * it is what shows on dark ones, so the ring never disappears into the world.
 */
export const HUD_FOCUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-foreground/70 focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/**
 * Anything you can press: answers the pointer on hover, sinks a little when
 * pressed (the cream system's buttons press in, they don't bounce).
 */
export const HUD_PRESSABLE = `${HUD_FOCUS} select-none transition-[background-color,box-shadow,scale] duration-150 enabled:hover:bg-palette-gray-100 enabled:active:scale-[0.96] enabled:active:bg-muted motion-reduce:transition-none motion-reduce:active:scale-100`;

/** Arriving: a short fade and rise, skipped for people who asked for less motion. */
export const HUD_ENTER =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-safe:ease-out";
