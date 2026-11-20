/**
 * The lounge's music theory: ii–V–I, the progression at the heart of jazz,
 * round all twelve keys, and an improviser for the line you play over it.
 * Nothing borrowed from any song — the band's parts and your line are
 * generated as you go. Pure functions (the band in lib/lounge-band.ts plays them).
 */

export type Degree = "ii" | "V" | "I";

/** Where the band is: a bar of the form in a key. */
export interface Harmony {
  /** the key's tonic, pitch class 0–11 */
  key: number;
  degree: Degree;
  /** chord root, pitch class */
  root: number;
  /** "m7" | "7" | "^7" */
  quality: string;
}

const NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
/** Keys round the cycle of fourths (C, F, B♭, E♭ …), the way jazz players practise it. */
const CYCLE = Array.from({ length: 12 }, (_, i) => (i * 5) % 12);
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** One key = four bars: ii, V, then I for two. */
export const BARS_PER_KEY = 4;
const FORM: readonly Degree[] = ["ii", "V", "I", "I"];

/**
 * Root above the key, quality, and the guide tone the line lands on as each
 * chord arrives: the 7th of ii falls a half step to the 3rd of V (C → B in
 * C major), which resolves up to the 3rd of I (E).
 */
const CHORDS: Record<Degree, { root: number; quality: string; guide: number }> = {
  ii: { root: 2, quality: "m7", guide: 0 },
  V: { root: 7, quality: "7", guide: 11 },
  I: { root: 0, quality: "^7", guide: 4 },
};

/** The harmony in a given bar of the endless form. */
export function harmonyAt(bar: number): Harmony {
  const key = CYCLE[Math.floor(bar / BARS_PER_KEY) % 12];
  const degree = FORM[bar % BARS_PER_KEY];
  const { root, quality } = CHORDS[degree];
  return { key, degree, root: (key + root) % 12, quality };
}

export const chordSymbol = (h: Harmony) => `${NAMES[h.root]}${h.quality}`;

/** chord tones above the root (3rd, 5th, 7th, 9th) */
const QUALITIES: Record<string, number[]> = {
  "^7": [4, 7, 11, 14],
  m7: [3, 7, 10, 14],
  "7": [4, 7, 10, 14],
};

/** Upper chord tones are folded into this window (D3 up to C#4). */
const VOICING_LOW = 50;
const fold = (pc: number, low: number) => low + ((((pc - low) % 12) + 12) % 12);

/** A rootless comping voicing: 3rd, 7th and 9th in the octave under the melody (the bass has the root). */
export function compVoicing(h: Harmony): number[] {
  const [third, , seventh, ninth] = QUALITIES[h.quality];
  return [third, seventh, ninth].map((interval) => fold(h.root + interval, VOICING_LOW)).sort((a, b) => a - b);
}

/**
 * A walking bass line for one bar: root, two chord tones climbing, and a
 * chromatic approach into the next bar's root. Kept between E1 and E2.
 */
export function walkingBar(h: Harmony, next: Harmony): number[] {
  const [third, fifth] = QUALITIES[h.quality];
  const root = fold(h.root, 28); // E1–D#2
  const target = fold(next.root, 28);
  const approach = target > root ? target - 1 : target + 1;
  return [root, root + third, root + fifth, approach];
}

/** The melody stays in a comfortable singing range. */
const LOW = 62; // D4
const HIGH = 79; // G5

/** Nearest MIDI note of pitch class `pc` to `near`, within the range. */
function nearest(pc: number, near: number) {
  let best = near;
  for (let midi = LOW, distance = Infinity; midi <= HIGH; midi++) {
    if ((((midi - pc) % 12) + 12) % 12 === 0 && Math.abs(midi - near) < distance) {
      best = midi;
      distance = Math.abs(midi - near);
    }
  }
  return best;
}

/**
 * The line you play: each step is one note that fits the chord the band is on.
 * A new chord → its guide tone (smooth voice leading); otherwise a walk along
 * the key's scale with the odd turn and leap; on the last beat before a change,
 * often a half-step approach into the next guide tone. `random` is injectable for tests.
 */
export function createImproviser(random: () => number = Math.random) {
  let note = 69; // A4
  let direction = 1;
  let lastChord = "";

  const scaleStep = (from: number, dir: number, key: number) => {
    let midi = from + dir;
    while (!MAJOR_SCALE.includes((((midi - key) % 12) + 12) % 12)) midi += dir;
    return midi;
  };

  return {
    /** `now` is the band's harmony, `next` the one coming; `beatsLeft` until it changes. */
    next(now: Harmony, next: Harmony, beatsLeft: number): number {
      const symbol = chordSymbol(now);
      if (symbol !== lastChord) {
        lastChord = symbol;
        note = nearest((now.key + CHORDS[now.degree].guide) % 12, note);
      } else if (beatsLeft <= 1 && chordSymbol(next) !== symbol && random() < 0.6) {
        note = nearest((next.key + CHORDS[next.degree].guide) % 12, note) - 1;
      } else {
        if (note >= HIGH - 2) direction = -1;
        else if (note <= LOW + 2) direction = 1;
        else if (random() < 0.3) direction = -direction;
        note = scaleStep(note, direction, now.key);
        if (random() < 0.2) note = scaleStep(note, direction, now.key); // the odd leap of a third
      }
      note = Math.max(LOW, Math.min(HIGH, note));
      return note;
    },
  };
}
