import type { QueryClient } from "@tanstack/react-query";
import { quizQueries, type QuizChordItem } from "@/entities/chord-quiz";
import type { ChordDifficulty } from "@/entities/chord-adventure";

const DIFFICULTIES: ChordDifficulty[] = ["EASY", "MEDIUM", "HARD"];
/** Top a pile back up when it gets this low (the server deals ten at a time). */
const REFILL_AT = 3;

/**
 * Chords for the run, one pile per difficulty, drawn from the quiz server's
 * random sets and refilled in the background as they run low. Never deals
 * the same chord twice in a row.
 */
export class ChordDeck {
  private piles = new Map<ChordDifficulty, QuizChordItem[]>();
  private refilling = new Set<ChordDifficulty>();
  private last: string | null = null;

  constructor(private queryClient: QueryClient) {}

  /** Fill every pile (call before the run starts). */
  async load() {
    this.piles.clear();
    this.last = null;
    await Promise.all(DIFFICULTIES.map((d) => this.refill(d)));
  }

  draw(difficulty: ChordDifficulty): QuizChordItem | null {
    // fall back to any pile that has cards, so a slow refill never stalls the run
    const order = [difficulty, ...DIFFICULTIES.filter((d) => d !== difficulty)];
    // first pass avoids repeating the last chord; the second takes anything, so a pile
    // that happens to hold only that chord can never stall the run
    for (const avoidRepeat of [true, false]) {
      for (const d of order) {
        const pile = this.piles.get(d) ?? [];
        const index = avoidRepeat ? pile.findIndex((c) => c.name !== this.last) : pile.length > 0 ? 0 : -1;
        if (index === -1) continue;
        const [card] = pile.splice(index, 1);
        if (pile.length < REFILL_AT) void this.refill(d);
        this.last = card.name;
        return card;
      }
    }
    // every pile is empty (fetches failing): ask again, so a later draw can succeed
    for (const d of DIFFICULTIES) void this.refill(d);
    return null;
  }

  /** Nothing to deal at all (e.g. the chord server is unreachable). */
  get isEmpty() {
    return DIFFICULTIES.every((d) => (this.piles.get(d)?.length ?? 0) === 0);
  }

  private async refill(difficulty: ChordDifficulty) {
    if (this.refilling.has(difficulty)) return;
    this.refilling.add(difficulty);
    try {
      // staleTime 0 on this query: every fetch is a fresh random set
      const fresh = await this.queryClient.fetchQuery(quizQueries.chords(difficulty));
      this.piles.set(difficulty, [...(this.piles.get(difficulty) ?? []), ...fresh]);
    } catch {
      // keep playing with what's left; an empty draw asks again
    } finally {
      this.refilling.delete(difficulty);
    }
  }
}
