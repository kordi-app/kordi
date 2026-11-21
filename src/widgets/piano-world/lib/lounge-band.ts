import * as Tone from "tone";
import { VOICINGS, blockChord, chordSymbol, compVoicing, createImproviser, harmonyAt, rootAndFifth, walkingBar, type Harmony, type Voicing } from "../model/standards";

/**
 * The lounge's jazz trio, all synthesized, round ii–V–I in every key — and a
 * vibraphone that plays your line in block chords, the moment you step.
 * The jukebox switches what the band plays: swing, bossa nova or a ballad.
 *
 * One band at a time; start() is idempotent and stop() frees everything.
 */
export type LoungeStyle = "swing" | "bossa" | "ballad";
export const LOUNGE_STYLES: readonly LoungeStyle[] = ["swing", "bossa", "ballad"];

/** A note in a bar: where (bar-relative transport time), how long, how hard. */
type Hit = [at: string, duration: string, velocity: number];
/** A bass note: where, which (from the bar's harmony), how long. */
type BassHit = [at: string, pick: (h: Harmony, next: Harmony) => number, duration: string];

interface StyleDef {
  bpm: number;
  swing: number;
  /** the cymbal (ride wash) */
  cymbal: Hit[];
  /** the hi-hat / shaker */
  hat: Hit[];
  /** a woody rim click (bossa's clave) */
  rim: Hit[];
  bass: BassHit[];
  comp: Hit[];
  /** how your steps are harmonised, how long they ring, and how hard (relative) */
  step: { voicing: Voicing; length: string; level: number };
}

const walk = (beat: number) => (h: Harmony, next: Harmony) => walkingBar(h, next)[beat];
const root = (h: Harmony) => rootAndFifth(h)[0];
const fifth = (h: Harmony) => rootAndFifth(h)[1];

const STYLES: Record<LoungeStyle, StyleDef> = {
  swing: {
    bpm: 112,
    swing: 0.55,
    // "ding, ding-a, ding, ding-a"
    cymbal: [["0:0", "16n", 0.6], ["0:1", "16n", 0.6], ["0:1:2", "32n", 0.35], ["0:2", "16n", 0.6], ["0:3", "16n", 0.6], ["0:3:2", "32n", 0.35]],
    hat: [["0:1", "32n", 1], ["0:3", "32n", 1]],
    rim: [],
    // walking: a note a beat, approaching the next chord
    bass: [0, 1, 2, 3].map((beat): BassHit => [`0:${beat}`, walk(beat), "8n"]),
    // the Charleston: on 1 and on the "and" of 2
    comp: [["0:0", "4n", 0.55], ["0:1:2", "8n", 0.45]],
    step: { voicing: VOICINGS.block, length: "8n", level: 1 },
  },
  bossa: {
    bpm: 132,
    swing: 0,
    cymbal: [],
    // shaker eighths, leaning on the off-beats
    hat: [0, 1, 2, 3].flatMap((beat): Hit[] => [[`0:${beat}`, "32n", 0.45], [`0:${beat}:2`, "32n", 0.8]]),
    rim: [["0:0", "32n", 0.8], ["0:1:2", "32n", 0.7], ["0:3", "32n", 0.7]],
    // root and fifth, each anticipated by an eighth
    bass: [["0:0", root, "4n."], ["0:1:2", fifth, "8n"], ["0:2", fifth, "4n."], ["0:3:2", root, "8n"]],
    comp: [["0:0", "8n", 0.45], ["0:1:2", "8n", 0.4], ["0:3", "8n", 0.4]],
    step: { voicing: VOICINGS.light, length: "8n", level: 0.85 },
  },
  ballad: {
    bpm: 68,
    swing: 0.6,
    cymbal: [["0:0", "8n", 0.35], ["0:2", "8n", 0.3]],
    hat: [["0:1", "32n", 0.6], ["0:3", "32n", 0.6]],
    rim: [],
    bass: [["0:0", root, "2n"], ["0:2", fifth, "2n"]],
    comp: [["0:0", "2n.", 0.42], ["0:3:2", "8n", 0.3]],
    step: { voicing: VOICINGS.lush, length: "2n", level: 0.8 },
  },
};

/** Levels, set so the band plus your line sits around the piano's loudness (K-weighted RMS). */
const LEVELS = { cymbal: -30, hat: -32, rim: -26, bass: -14, comp: -20, vibes: -14 };

interface Band {
  nodes: Tone.ToneAudioNode[];
  events: number[];
  vibes: Tone.PolySynth;
  improviser: ReturnType<typeof createImproviser>;
}

let band: Band | null = null;
let style: LoungeStyle = "swing";

const note = (midi: number) => Tone.Frequency(midi, "midi").toNote();
/** The bar (0-based) a transport time falls in. */
const barAt = (time: number) => {
  const transport = Tone.getTransport();
  return Math.floor(transport.getTicksAtTime(time) / (transport.PPQ * 4));
};

/** Start the band in the current style (once audio has been started by a gesture). */
export function startLoungeBand() {
  if (band || Tone.getContext().state !== "running") return;
  const def = STYLES[style];
  const transport = Tone.getTransport();
  transport.bpm.value = def.bpm;
  transport.swing = def.swing;
  transport.swingSubdivision = "8n";

  // cymbal: a shimmering wash of filtered noise with a long tail
  // (MetalSynth throws when retriggered on a repeating schedule, so noise it is)
  const cymbalTone = new Tone.Filter({ type: "bandpass", frequency: 8500, Q: 1.4 }).toDestination();
  const cymbal = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.55, sustain: 0 } }).connect(cymbalTone);
  cymbal.volume.value = LEVELS.cymbal;

  const hatTone = new Tone.Filter({ type: "highpass", frequency: 6000 }).toDestination();
  const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.04, sustain: 0 } }).connect(hatTone);
  hat.volume.value = LEVELS.hat;

  // a dry, woody click
  const rim = new Tone.MembraneSynth({ pitchDecay: 0.008, octaves: 1.5, envelope: { attack: 0.001, decay: 0.06, sustain: 0 } }).toDestination();
  rim.volume.value = LEVELS.rim;

  // upright-ish bass: a plucked, rounded tone
  const bass = new Tone.MonoSynth({
    oscillator: { type: "triangle" },
    filter: { type: "lowpass", Q: 1 },
    filterEnvelope: { attack: 0.005, decay: 0.25, sustain: 0.4, baseFrequency: 180, octaves: 2 },
    envelope: { attack: 0.005, decay: 0.35, sustain: 0.5, release: 0.15 },
  }).toDestination();
  bass.volume.value = LEVELS.bass;

  // Rhodes-style comping
  const comp = new Tone.PolySynth(Tone.FMSynth);
  comp.set({
    harmonicity: 3,
    modulationIndex: 1.4,
    oscillator: { type: "sine" },
    envelope: { attack: 0.005, decay: 0.8, sustain: 0.25, release: 0.6 },
    modulation: { type: "sine" },
    modulationEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.1, release: 0.4 },
  });
  const compTrem = new Tone.Tremolo({ frequency: 4.5, depth: 0.25 }).toDestination().start();
  comp.connect(compTrem);
  comp.volume.value = LEVELS.comp;

  // vibraphone for your line: a bright bar with a gentle motor tremolo and a little room
  const vibes = new Tone.PolySynth(Tone.FMSynth);
  vibes.set({
    harmonicity: 4,
    modulationIndex: 1.6,
    oscillator: { type: "sine" },
    envelope: { attack: 0.002, decay: 1.6, sustain: 0, release: 1.2 },
    modulation: { type: "sine" },
    modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.3 },
  });
  const vibesRoom = new Tone.Reverb({ decay: 1.8, wet: 0.22 }).toDestination();
  const vibesTrem = new Tone.Tremolo({ frequency: 5.5, depth: 0.3 }).connect(vibesRoom).start();
  vibes.connect(vibesTrem);
  vibes.volume.value = LEVELS.vibes;

  // each part's hits repeat every bar, at their place in it
  const every = (at: string, play: (time: number) => void) => transport.scheduleRepeat(play, "1m", at);
  const events = [
    ...def.cymbal.map(([at, d, v]) => every(at, (t) => cymbal.triggerAttackRelease(d, t, v))),
    ...def.hat.map(([at, d, v]) => every(at, (t) => hat.triggerAttackRelease(d, t, v))),
    ...def.rim.map(([at, d, v]) => every(at, (t) => rim.triggerAttackRelease("G5", d, t, v))),
    ...def.bass.map(([at, pick, d]) =>
      every(at, (t) => {
        const bar = barAt(t);
        bass.triggerAttackRelease(note(pick(harmonyAt(bar), harmonyAt(bar + 1))), d, t, 0.85);
      }),
    ),
    ...def.comp.map(([at, d, v]) =>
      every(at, (t) => comp.triggerAttackRelease(compVoicing(harmonyAt(barAt(t))).map(note), d, t, v)),
    ),
  ];

  transport.start("+0.05");
  band = {
    nodes: [cymbal, cymbalTone, hat, hatTone, rim, bass, comp, compTrem, vibes, vibesTrem, vibesRoom],
    events,
    vibes,
    improviser: createImproviser(),
  };
}

/** Stop the band and free its synths. */
export function stopLoungeBand() {
  if (!band) return;
  const transport = Tone.getTransport();
  band.events.forEach((id) => transport.clear(id));
  transport.stop();
  transport.position = 0;
  transport.swing = 0;
  band.nodes.forEach((node) => node.dispose());
  band = null;
}

export const isLoungeBandPlaying = () => band !== null;

/** The jukebox: switch to the next style (restarting the band in it, if it's playing). */
export function nextLoungeStyle(): LoungeStyle {
  style = LOUNGE_STYLES[(LOUNGE_STYLES.indexOf(style) + 1) % LOUNGE_STYLES.length];
  if (band) {
    stopLoungeBand();
    startLoungeBand();
  }
  return style;
}

/**
 * Your step: the improviser picks a short phrase for the chord the band is on,
 * each note harmonised as a four-voice block chord (melody on top, voices
 * moving by step from chord to chord), and the vibraphone plays it right
 * away — waiting for the beat felt like lag. Returns the phrase's last note
 * and the chord it was played over (what the note display shows here).
 */
export function playLoungeStep(velocity = 0.75): { midi: number; chord: string } | null {
  if (!band) return null;
  const transport = Tone.getTransport();
  const ticks = transport.ticks;
  const bar = Math.floor(ticks / (transport.PPQ * 4));
  const beat = Math.floor(ticks / transport.PPQ) % 4;
  // the I lasts two bars: count the beats to the real change
  const beatsLeft = (harmonyAt(bar + 1).degree === harmonyAt(bar).degree ? 8 : 4) - beat;
  const phrase = band.improviser.next(harmonyAt(bar), harmonyAt(bar + 1), beat, beatsLeft);
  const { vibes } = band;
  const harmony = harmonyAt(bar);
  const { voicing, length: ring, level } = STYLES[style].step;
  const time = Tone.immediate();
  const eighth = Tone.Time("8n").toSeconds();
  phrase.forEach((midi, i) => {
    const at = time + i * eighth;
    const v = velocity * level * (i ? 0.85 : 1);
    const [top, ...under] = blockChord(midi, harmony, voicing);
    // the melody a touch louder than the voices under it, the last chord left to ring
    const length = i === phrase.length - 1 ? ring : "8n";
    vibes.triggerAttackRelease(note(top), length, at, v);
    if (under.length) vibes.triggerAttackRelease(under.map(note), length, at, v * 0.6);
  });
  return { midi: phrase[phrase.length - 1], chord: chordSymbol(harmony) };
}
