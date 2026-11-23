import * as Tone from "tone";

/**
 * The Tone Transport (the shared musical clock) has one user at a time — a
 * band, a groove, the practice metronome. Each borrows it with a lease:
 * schedules only through the lease, and on release clears only its own
 * events, never the whole timeline (transport.cancel() would wipe anyone
 * else's). Taking a lease while another is held retires the old one first,
 * so two users can never leave their patterns layered on one clock.
 */
export interface TransportLease {
  /** repeat `callback` every `interval`, starting at `start` (transport time) */
  repeat(callback: (time: number) => void, interval: Tone.Unit.Time, start?: Tone.Unit.TransportTime): number;
  /** drop some of this lease's events (e.g. to swap a pattern) */
  clear(ids: readonly number[]): void;
  /** tempo and feel */
  set(settings: { bpm?: number; swing?: number; swingSubdivision?: Tone.Unit.Subdivision }): void;
  /** run the clock (if it isn't already) */
  start(offset?: Tone.Unit.Time): void;
  /** clear everything this lease scheduled and stop the clock; safe to call twice */
  release(): void;
  readonly active: boolean;
}

let holder: TransportLease | null = null;

export function leaseTransport(): TransportLease {
  holder?.release();
  const transport = Tone.getTransport();
  const ids = new Set<number>();
  let active = true;

  const lease: TransportLease = {
    repeat(callback, interval, start = 0) {
      if (!active) return -1;
      const id = transport.scheduleRepeat(callback, interval, start);
      ids.add(id);
      return id;
    },
    clear(list) {
      for (const id of list) {
        if (ids.delete(id)) transport.clear(id);
      }
    },
    set({ bpm, swing, swingSubdivision }) {
      if (!active) return;
      if (bpm !== undefined) transport.bpm.value = bpm;
      if (swing !== undefined) transport.swing = swing;
      if (swingSubdivision !== undefined) transport.swingSubdivision = swingSubdivision;
    },
    start(offset = "+0.05") {
      if (active && transport.state !== "started") transport.start(offset);
    },
    release() {
      if (!active) return;
      active = false;
      for (const id of ids) transport.clear(id);
      ids.clear();
      if (holder === lease) {
        holder = null;
        transport.stop();
        transport.position = 0;
        transport.swing = 0;
      }
    },
    get active() {
      return active;
    },
  };
  holder = lease;
  return lease;
}
