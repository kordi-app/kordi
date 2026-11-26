import { WARP_STONES, type WarpStoneId } from "./island";
import { WORLD_CONTRACT } from "./world-contract";

/**
 * Which warp stones are awake, from the two places they're kept: this
 * browser (a guest's, or a member's the server hasn't confirmed yet) and the
 * account (a member's, on the server). Pure; ui/hooks/use-warp-stones.ts
 * holds the state and does the storing and sending.
 */

/** Awake from the start, so there's always somewhere to warp back to (the server lists it too) */
export const ALWAYS_AWAKE = WORLD_CONTRACT.warpStones.alwaysAwake.filter(isWarpStone);

export function isWarpStone(id: unknown): id is WarpStoneId {
  return WARP_STONES.some((s) => s.id === id);
}

/** Only real stone ids out of whatever was stored or sent back (anything else is dropped) */
export const warpStonesIn = (raw: unknown): WarpStoneId[] => (Array.isArray(raw) ? raw.filter(isWarpStone) : []);

/** Everything awake: the ones always awake, the browser's and the account's */
export function awakeStones(local: Iterable<WarpStoneId>, account: readonly unknown[] = []): ReadonlySet<WarpStoneId> {
  return new Set<WarpStoneId>([...ALWAYS_AWAKE, ...local, ...warpStonesIn(account)]);
}

/** What the browser still has to send once the account has `sent` (stones woken meanwhile stay) */
export function stillToSend(stored: readonly WarpStoneId[], sent: readonly WarpStoneId[]): WarpStoneId[] {
  return stored.filter((id) => !sent.includes(id));
}

/** What a member opening the world should hand to the account: all the browser holds, but the ones always awake */
export function toSend(stored: readonly WarpStoneId[]): WarpStoneId[] {
  return stored.filter((id) => !ALWAYS_AWAKE.includes(id));
}
