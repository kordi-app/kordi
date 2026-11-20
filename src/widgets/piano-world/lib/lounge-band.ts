import * as Tone from "tone";
import { compVoicing, createImproviser, harmonyAt, walkingBar } from "../model/standards";

/**
 * The lounge's jazz trio, all synthesized: swing ride and hi-hat, a walking
 * bass, and Rhodes comping round ii–V–I in every key — and a vibraphone that
 * plays your line, one note per step, landing on the next swung eighth.
 *
 * One band at a time; start() is idempotent and stop() frees everything.
 */
const BPM = 112;
/** Levels, set so the band plus your line sits around the piano's loudness (K-weighted RMS). */
const LEVELS = { ride: -30, hat: -32, bass: -14, comp: -20, vibes: -10 };

interface Band {
  nodes: Tone.ToneAudioNode[];
  events: number[];
  vibes: Tone.PolySynth;
  improviser: ReturnType<typeof createImproviser>;
}

let band: Band | null = null;

/** Bar and beat (0-based) the transport is on right now. */
function where() {
  const [bars, beats] = String(Tone.getTransport().position).split(":").map(Number);
  return { bar: bars, beat: Math.floor(beats) };
}

/** Start the band (once audio has been started by a gesture). */
export function startLoungeBand() {
  if (band || Tone.getContext().state !== "running") return;
  const transport = Tone.getTransport();
  transport.bpm.value = BPM;
  transport.swing = 0.55;
  transport.swingSubdivision = "8n";

  // ride: "ding, ding-a, ding, ding-a" — a shimmering wash of filtered noise with a long tail
  // (MetalSynth throws when retriggered on a repeating schedule, so noise it is)
  const rideTone = new Tone.Filter({ type: "bandpass", frequency: 8500, Q: 1.4 }).toDestination();
  const ride = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.55, sustain: 0 } }).connect(rideTone);
  ride.volume.value = LEVELS.ride;

  // hi-hat foot on 2 and 4
  const hatFilter = new Tone.Filter({ type: "highpass", frequency: 6000 }).toDestination();
  const hat = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.001, decay: 0.04, sustain: 0 } }).connect(hatFilter);
  hat.volume.value = LEVELS.hat;

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

  const events = [
    // ride on every beat, plus the swung "a" after 2 and 4
    transport.scheduleRepeat((time) => ride.triggerAttackRelease("16n", time, 0.6), "4n", 0),
    transport.scheduleRepeat((time) => ride.triggerAttackRelease("32n", time, 0.35), "2n", "0:1:2"),
    transport.scheduleRepeat((time) => hat.triggerAttackRelease("32n", time), "2n", "0:1"),
    // walking bass: a bar's line, one note per beat
    transport.scheduleRepeat(
      (time) => {
        const { bar } = where();
        walkingBar(harmonyAt(bar), harmonyAt(bar + 1)).forEach((midi, beat) =>
          bass.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), "8n", time + beat * Tone.Time("4n").toSeconds(), 0.85),
        );
      },
      "1m",
      0,
    ),
    // comping: the Charleston — on 1, and on the "and" of 2
    transport.scheduleRepeat(
      (time) => {
        const notes = compVoicing(harmonyAt(where().bar)).map((m) => Tone.Frequency(m, "midi").toNote());
        comp.triggerAttackRelease(notes, "4n", time, 0.55);
        comp.triggerAttackRelease(notes, "8n", time + Tone.Time("0:1:2").toSeconds(), 0.45);
      },
      "1m",
      0,
    ),
  ];

  transport.start("+0.05");
  band = { nodes: [ride, rideTone, hat, hatFilter, bass, comp, compTrem, vibes, vibesTrem, vibesRoom], events, vibes, improviser: createImproviser() };
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

/**
 * Your step: the improviser picks a note for the chord the band is on, and
 * the vibraphone plays it on the next (swung) eighth. Returns the note.
 */
export function playLoungeStep(velocity = 0.75): number | null {
  if (!band) return null;
  const { bar, beat } = where();
  const midi = band.improviser.next(harmonyAt(bar), harmonyAt(bar + 1), 4 - beat);
  const { vibes } = band;
  Tone.getTransport().scheduleOnce((time) => {
    vibes.triggerAttackRelease(Tone.Frequency(midi, "midi").toNote(), "8n", time, velocity);
  }, "@8n");
  return midi;
}
