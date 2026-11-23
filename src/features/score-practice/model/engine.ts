import type { ScoreGroup, ScoreNote, ScoreTimeline } from "@/entities/score";

/** listen: the app plays everything · wait: the music waits for you · tempo: it keeps going and judges your timing */
export type PracticeMode = "listen" | "wait" | "tempo";
export type Hands = "right" | "left" | "both";
export type PracticeStatus = "idle" | "playing" | "waiting" | "finished";

export interface PracticeStats {
  /** your notes played (on time, in tempo mode) */
  hits: number;
  /** your notes that went by unplayed (tempo mode) */
  misses: number;
  /** keys that weren't in the score at that moment */
  wrong: number;
}

export interface PracticeView {
  status: PracticeStatus;
  /** the sheet cursor's step */
  cursor: number;
  /** your next notes (highlighted on the keyboard) */
  expected: number[];
  stats: PracticeStats;
}

export interface PracticeSettings {
  mode: PracticeMode;
  hands: Hands;
  /** tempo factor: 1 = as written */
  speed: number;
}

/** Where the engine sends the notes it plays (audio-clock time, seconds). */
export type NoteSink = (midi: number, time: number, duration: number) => void;

/** A press this close (seconds) to a note's time counts as playing it, in tempo mode. */
export const HIT_WINDOW = 0.2;
/** Notes are handed to the audio clock this far ahead (seconds), so they land exactly on time. */
const LOOKAHEAD = 0.25;
/** A short breath before the first note. */
const LEAD_IN = 0.3;
const EPSILON = 1e-6;

const NO_STATS: PracticeStats = { hits: 0, misses: 0, wrong: 0 };

/**
 * Plays a score against the audio clock and follows the player. One loop
 * serves all three modes: notes for the hands you practise are yours, the
 * rest the engine plays; in wait mode the clock stops at each of your notes
 * until you play them.
 *
 * Framework-free: the caller drives it with tick(now) and press(midi, now).
 */
export class PracticeEngine {
  private readonly groups: ScoreGroup[];
  private readonly endBeat: number;
  private readonly bpm: number;
  private settings: PracticeSettings = { mode: "wait", hands: "right", speed: 1 };

  private running = false;
  private finished = false;
  private anchorBeat = 0;
  private anchorTime = 0;
  private cursor = 0;
  /** next group whose notes the engine still has to play */
  private scheduled = 0;
  /** wait mode: the group the music is waiting on (-1: none left) */
  private block = -1;
  private struck = new Set<number>();
  /** tempo mode: first group not yet fully judged, and the notes already hit */
  private judged = 0;
  private hit = new Set<string>();
  private stats: PracticeStats = { ...NO_STATS };

  constructor(
    timeline: ScoreTimeline,
    private readonly sink: NoteSink,
  ) {
    this.groups = timeline.groups;
    this.endBeat = timeline.endBeat;
    this.bpm = timeline.bpm;
  }

  get isRunning() {
    return this.running;
  }

  configure(settings: PracticeSettings, now: number) {
    const beat = this.running ? this.beatAt(now) : 0;
    this.settings = settings;
    // a new speed keeps the music where it is
    if (this.running) this.anchor(beat, now);
  }

  /** Start (or resume) from a cursor step. */
  start(fromGroup: number, now: number) {
    const from = Math.min(Math.max(fromGroup, 0), Math.max(this.groups.length - 1, 0));
    if (from === 0 || this.finished) this.stats = { ...NO_STATS };
    this.running = true;
    this.finished = false;
    this.cursor = from;
    this.scheduled = from;
    this.judged = from;
    this.hit.clear();
    this.struck.clear();
    this.block = this.nextPlayerGroup(from);
    this.anchor(this.groups[from]?.beat ?? 0, now + LEAD_IN);
  }

  stop() {
    this.running = false;
  }

  /** Back to the top, stopped. */
  reset() {
    this.running = false;
    this.finished = false;
    this.cursor = 0;
    this.stats = { ...NO_STATS };
  }

  tick(now: number): PracticeView {
    if (!this.running) return this.view();
    const { mode } = this.settings;
    let beat = this.beatAt(now);
    const waitingOn = mode === "wait" && this.block >= 0 ? this.groups[this.block] : null;
    const frozen = waitingOn !== null && beat >= waitingOn.beat;
    if (frozen) beat = waitingOn.beat;

    // hand the engine's own notes to the audio clock a little ahead
    const horizon = frozen ? beat : beat + LOOKAHEAD / this.secondsPerBeat();
    while (this.scheduled < this.groups.length && this.groups[this.scheduled].beat <= horizon + EPSILON) {
      if (mode === "wait" && this.block >= 0 && this.scheduled >= this.block) break;
      const group = this.groups[this.scheduled];
      for (const note of group.notes) {
        if (!this.isPlayers(note)) this.sink(note.midi, this.timeAt(note.beat), note.length * this.secondsPerBeat());
      }
      this.scheduled += 1;
    }

    if (mode === "tempo") this.judgeMisses(now);

    while (this.cursor + 1 < this.groups.length && this.groups[this.cursor + 1].beat <= beat + EPSILON) this.cursor += 1;

    if (beat >= this.endBeat - EPSILON && this.scheduled >= this.groups.length) {
      if (mode === "tempo") this.judgeMisses(Infinity);
      this.running = false;
      this.finished = true;
    }
    return this.view(frozen);
  }

  /** A key went down. */
  press(midi: number, now: number) {
    if (!this.running) return;
    const { mode } = this.settings;
    if (mode === "wait") this.pressWaiting(midi, now);
    else if (mode === "tempo") this.pressInTempo(midi, now);
  }

  private pressWaiting(midi: number, now: number) {
    const group = this.block >= 0 ? this.groups[this.block] : null;
    if (!group) return;
    const wanted = this.playerNotes(group);
    if (!wanted.some((n) => n.midi === midi)) {
      this.stats.wrong += 1;
      return;
    }
    this.struck.add(midi);
    if (!wanted.every((n) => this.struck.has(n.midi))) return;
    // all there: the music moves on from this chord (now, if it was waiting)
    this.stats.hits += wanted.length;
    if (this.beatAt(now) >= group.beat) this.anchor(group.beat, now);
    this.struck.clear();
    this.block = this.nextPlayerGroup(this.block + 1);
  }

  private pressInTempo(midi: number, now: number) {
    for (let g = this.judged; g < this.groups.length; g++) {
      const group = this.groups[g];
      const time = this.timeAt(group.beat);
      if (time - HIT_WINDOW > now) break;
      if (Math.abs(time - now) > HIT_WINDOW) continue;
      const index = group.notes.findIndex((n, i) => n.midi === midi && this.isPlayers(n) && !this.hit.has(`${g}:${i}`));
      if (index >= 0) {
        this.hit.add(`${g}:${index}`);
        this.stats.hits += 1;
        return;
      }
    }
    this.stats.wrong += 1;
  }

  /** Groups whose window has closed: anything of yours not played was missed. */
  private judgeMisses(now: number) {
    while (this.judged < this.groups.length && this.timeAt(this.groups[this.judged].beat) + HIT_WINDOW < now) {
      const g = this.judged;
      this.groups[g].notes.forEach((n, i) => {
        if (this.isPlayers(n) && !this.hit.has(`${g}:${i}`)) this.stats.misses += 1;
      });
      this.judged += 1;
    }
  }

  private view(frozen = false): PracticeView {
    const status: PracticeStatus = this.finished ? "finished" : !this.running ? "idle" : frozen ? "waiting" : "playing";
    return { status, cursor: this.cursor, expected: this.expectedNotes(), stats: { ...this.stats } };
  }

  private expectedNotes(): number[] {
    if (this.settings.mode === "listen") return [];
    const from = this.settings.mode === "wait" && this.block >= 0 ? this.block : this.nextPlayerGroup(this.cursor);
    if (from < 0) return [];
    return this.playerNotes(this.groups[from]).map((n) => n.midi);
  }

  private nextPlayerGroup(from: number) {
    if (this.settings.mode === "listen") return -1;
    for (let g = from; g < this.groups.length; g++) if (this.playerNotes(this.groups[g]).length > 0) return g;
    return -1;
  }

  private playerNotes(group: ScoreGroup) {
    return group.notes.filter((n) => this.isPlayers(n));
  }

  private isPlayers(note: ScoreNote) {
    const { mode, hands } = this.settings;
    if (mode === "listen") return false;
    return hands === "both" || (hands === "right" ? note.staff === 0 : note.staff !== 0);
  }

  private secondsPerBeat() {
    return 60 / (this.bpm * this.settings.speed);
  }

  private anchor(beat: number, time: number) {
    this.anchorBeat = beat;
    this.anchorTime = time;
  }

  private beatAt(time: number) {
    return this.anchorBeat + (time - this.anchorTime) / this.secondsPerBeat();
  }

  private timeAt(beat: number) {
    return this.anchorTime + (beat - this.anchorBeat) * this.secondsPerBeat();
  }
}
