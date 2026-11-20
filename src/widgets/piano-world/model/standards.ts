/**
 * The lounge's songbook: jazz standards in the public domain (in Korea and the
 * US), played one melody note per step whatever key you land on, with the
 * chord changes voiced under it. Melodies only (the lyrics are someone else's)
 * in our own voicings.
 *
 * Each event is one melody note (tied notes are one event, rests are skipped);
 * `chord` marks where the harmony changes.
 */

export interface SongEvent {
  /** melody note (MIDI) */
  midi: number;
  /** chord symbol that starts on this note: root + quality, e.g. "Bb^7", "Gm7", "F7" */
  chord?: string;
}

export interface Song {
  title: string;
  composer: string;
  year: number;
  events: readonly SongEvent[];
}

// note names → MIDI around the melody's range (C5 = 72)
const F4 = 65, G4 = 67, Bb4 = 70, C5 = 72, D5 = 74, Eb5 = 75, E5 = 76;
const n = (midi: number, chord?: string): SongEvent => (chord ? { midi, chord } : { midi });

/** The A section's first six bars (the same in every A). */
const A_OPENING: SongEvent[] = [
  n(F4, "Bb^7"), n(G4, "Gm7"), // I got rhy-
  n(Bb4, "Cm7"), n(C5, "F7"), // -thm
  n(C5, "Bb^7"), n(Bb4, "Gm7"), // I got mu-
  n(G4, "Cm7"), n(F4, "F7"), // -sic
  n(F4, "Bb^7"), n(G4, "Bb7"), // I got my
  n(Bb4, "Eb^7"), n(C5, "Ebm7"), n(Eb5), n(C5), // man, who could
];

/**
 * George Gershwin, "I Got Rhythm" (1930), in B♭: AABA, 32 bars. Transcribed
 * from a lead sheet (OSU Jazz Camp audition packet, concert pitch); the
 * changes are the "rhythm changes" every jazz player knows.
 */
const I_GOT_RHYTHM: Song = {
  title: "I Got Rhythm",
  composer: "George Gershwin",
  year: 1930,
  events: [
    // A — first ending turns around
    ...A_OPENING,
    n(D5, "Dm7"), n(D5), n(C5, "G7"), n(D5), n(C5), n(Bb4, "Cm7"),
    // A — second ending lands home
    ...A_OPENING,
    n(D5, "Cm7"), n(D5), n(C5, "F7"), n(D5), n(C5), n(Bb4, "Bb^7"),
    // B — the bridge: dominants round the cycle of fifths
    n(D5, "D7"), n(D5), n(D5), n(E5),
    n(D5, "G7"), n(D5), n(D5), n(G4),
    n(C5, "C7"), n(C5), n(C5), n(D5),
    n(C5, "F7"), n(C5), n(C5), n(F4),
    // A — last time, home
    ...A_OPENING,
    n(D5, "Cm7"), n(D5), n(C5, "F7"), n(D5), n(C5), n(Bb4, "Bb^7"),
  ],
};

export const SONGBOOK: readonly Song[] = [I_GOT_RHYTHM];

/** Each time round, the tune moves to a new key (semitones from the written key). */
export const CHORUS_KEYS = [0, 2, 5, -2];

const ROOTS: Record<string, number> = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
/** chord tones above the root for each quality (3rd, 5th, 7th, 9th) */
const QUALITIES: Record<string, number[]> = {
  "^7": [4, 7, 11, 14], // major seventh (add 9)
  m7: [3, 7, 10, 14], // minor seventh (add 9)
  "7": [4, 7, 10, 14], // dominant (add 9)
};

/** Upper chord tones are folded into this window (D3 up to C#4), under the melody. */
const VOICING_LOW = 50;

/**
 * A soft jazz voicing for a chord symbol: the root low in the bass, then the
 * 3rd, 7th and 9th folded into the octave under the melody (the 5th left out,
 * as pianists usually do). `shift` transposes it with the tune.
 */
export function voiceChord(symbol: string, shift = 0): number[] {
  const match = /^([A-G]b?)(\^7|m7|7)$/.exec(symbol);
  if (!match) return [];
  const root = (((ROOTS[match[1]] + shift) % 12) + 12) % 12;
  const [third, , seventh, ninth] = QUALITIES[match[2]];
  const fold = (pc: number) => VOICING_LOW + ((((pc - VOICING_LOW) % 12) + 12) % 12);
  const upper = [third, seventh, ninth].map((interval) => fold(root + interval)).sort((a, b) => a - b);
  return [36 + root, ...upper]; // bass: C2–B2
}
