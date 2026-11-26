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
  /** warm-up names still to deal this round, and which list they came from */
  private bag: string[] = [];
  private bagKey = "";

  constructor(private queryClient: QueryClient) {}

  /** Fill every pile (call before the run starts). */
  async load() {
    this.piles.clear();
    this.last = null;
    this.bag = [];
    this.bagKey = "";
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

  /**
   * A chord from a fixed list of names (the warm-up), dealt like a shuffled
   * deck: every name comes up once before any repeats (and never twice in a
   * row across a reshuffle). Made here rather than fetched, so the opening
   * never waits on the server.
   */
  drawFrom(names: readonly string[]): QuizChordItem {
    const key = names.join(",");
    if (this.bagKey !== key || this.bag.length === 0) {
      this.bagKey = key;
      this.bag = shuffle(names.filter((n) => n !== this.last || names.length === 1));
    }
    const name = this.bag.pop()!;
    this.last = name;
    return made(name, -1 - names.indexOf(name));
  }

  /** Chords by name, in order (a boss's warm-up progression), made here like the warm-up's. */
  named(names: readonly string[]): QuizChordItem[] {
    this.last = names[names.length - 1] ?? this.last;
    return names.map((name, i) => made(name, -1000 - i));
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

/** A plain major or minor triad by name; its id is negative, so it can't collide with a server chord's. */
function made(name: string, id: number): QuizChordItem {
  const minor = name.endsWith("m");
  return { id, chordKey: minor ? name.slice(0, -1) : name, chordType: minor ? "MINOR" : "MAJOR", name, notes: "", difficulty: "EASY" };
}

/** A shuffled copy (Fisher–Yates). */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
