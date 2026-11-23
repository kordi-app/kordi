/**
 * Public-domain tunes for the Grand Hall's follow-the-path game, written as
 * MIDI notes around middle C so the path stays near where you spawn.
 */
export interface Melody {
  /** i18n key under home.world.melodies */
  key: "twinkle" | "odeToJoy" | "maryLamb";
  notes: number[];
}

const C = 60, D = 62, E = 64, F = 65, G = 67, A = 69;

export const MELODIES: Melody[] = [
  // Twinkle Twinkle Little Star (작은별), first phrase
  { key: "twinkle", notes: [C, C, G, G, A, A, G, F, F, E, E, D, D, C] },
  // Ode to Joy (환희의 송가), first phrase
  { key: "odeToJoy", notes: [E, E, F, G, G, F, E, D, C, C, D, E, E, D, D] },
  // Mary Had a Little Lamb (떴다 떴다 비행기)
  { key: "maryLamb", notes: [E, D, C, D, E, E, E, D, D, D, E, G, G] },
];
