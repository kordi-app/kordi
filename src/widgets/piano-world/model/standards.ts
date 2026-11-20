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

/** Root and fifth of the chord, low (for bossa and ballad bass lines). */
export function rootAndFifth(h: Harmony): [number, number] {
  const root = fold(h.root, 28);
  return [root, root + QUALITIES[h.quality][1]];
}

/**
 * A block chord under a melody note, the way jazz pianists harmonise a line:
 * the melody on top, then three tones of the chord below it — chosen from the
 * 3rd, 5th, 7th and 9th (13th on a dominant), always at least a whole step
 * under the next voice so nothing rubs. Because the line moves by step, the
 * voices under it move by step too: the chords connect smoothly.
 */
export function blockChord(melody: number, h: Harmony): number[] {
  const colours: Record<string, number[]> = {
    "^7": [4, 7, 11, 14],
    m7: [3, 7, 10, 14],
    "7": [4, 9, 10, 14], // 3, 13, ♭7, 9
  };
  const pcs = colours[h.quality].map((interval) => (h.root + interval) % 12);
  const voices = [melody];
  for (let midi = melody - 2; midi > melody - 14 && voices.length < 4; midi--) {
    const pc = ((midi % 12) + 12) % 12;
    if (pc === ((melody % 12) + 12) % 12 || !pcs.includes(pc)) continue;
    if (voices[voices.length - 1] - midi < 2) continue; // keep a whole step from the voice above
    voices.push(midi);
  }
  return voices;
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
 * The line you play. Each step is a short phrase (one note, now and then two)
 * that fits the chord the band is on, so any key you step on sounds like jazz:
 * - a new chord → its guide tone (smooth voice leading)
 * - strong beats (1 and 3) → a chord tone; weak beats → a scale step
 * - sometimes a bebop "enclosure": the note above, then the target
 * - sometimes a blue note (♭3 or ♭5) bent back to the chord
 * - just before a change, often a half-step approach into the next guide tone
 * `random` is injectable for tests.
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
  /** the chord tone (3rd, 5th, 7th or 9th) nearest to `from`, one step along `dir` */
  const chordToneStep = (from: number, dir: number, h: Harmony) => {
    const tones = QUALITIES[h.quality].map((interval) => (h.root + interval) % 12);
    let midi = from + dir;
    while (!tones.includes(((midi % 12) + 12) % 12)) midi += dir;
    return midi;
  };
  const clamp = (midi: number) => Math.max(LOW, Math.min(HIGH, midi));

  return {
    /**
     * `now` is the band's harmony, `next` the one coming; `beat` is 0–3 in the
     * bar and `beatsLeft` the beats until the chord changes. Returns 1–2 notes
     * (a second one lands an eighth later).
     */
    next(now: Harmony, next: Harmony, beat: number, beatsLeft: number): number[] {
      const symbol = chordSymbol(now);
      if (symbol !== lastChord) {
        lastChord = symbol;
        note = nearest((now.key + CHORDS[now.degree].guide) % 12, note);
        return [note];
      }
      if (beatsLeft <= 1 && chordSymbol(next) !== symbol && random() < 0.6) {
        note = nearest((next.key + CHORDS[next.degree].guide) % 12, note) - 1;
        return [clamp(note)];
      }
      if (note >= HIGH - 3) direction = -1;
      else if (note <= LOW + 3) direction = 1;
      else if (random() < 0.3) direction = -direction;

      const strong = beat % 2 === 0;
      const target = clamp(strong ? chordToneStep(note, direction, now) : scaleStep(note, direction, now.key));
      const roll = random();
      if (roll < 0.18) {
        // bebop enclosure: the scale note above, then the target
        note = target;
        return [clamp(scaleStep(target, 1, now.key)), target];
      }
      if (roll < 0.28 && now.degree !== "ii") {
        // a blue note, resolving to the chord tone a half step away
        const blue = nearest((now.key + (random() < 0.5 ? 3 : 6)) % 12, target);
        note = clamp(blue + 1);
        return [clamp(blue), note];
      }
      note = target;
      return [note];
    },
  };
}
