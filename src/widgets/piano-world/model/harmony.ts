/**
 * Lounge chords: each step plays a seventh chord rooted on that key.
 * White keys take their diatonic seventh in C major (Cmaj7, Dm7, Em7, Fmaj7,
 * G7, Am7, Bm7b5); black keys, which sit outside the key, get a dominant 7th
 * so they sound like a jazzy passing chord.
 */
const DIATONIC: Record<number, number[]> = {
  0: [0, 4, 7, 11], // Imaj7
  2: [0, 3, 7, 10], // ii m7
  4: [0, 3, 7, 10], // iii m7
  5: [0, 4, 7, 11], // IVmaj7
  7: [0, 4, 7, 10], // V7
  9: [0, 3, 7, 10], // vi m7
  11: [0, 3, 6, 10], // vii m7b5
};
const DOMINANT_7 = [0, 4, 7, 10];

export function seventhChordOn(root: number): number[] {
  const intervals = DIATONIC[root % 12] ?? DOMINANT_7;
  return intervals.map((interval) => root + interval).filter((midi) => midi <= 108);
}
