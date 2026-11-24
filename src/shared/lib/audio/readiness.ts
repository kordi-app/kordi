import { createValueStore, useStoreValue } from "@/shared/lib/react/value-store";

/**
 * Where the app's one shared audio engine is, for every page and the world:
 * - `off`: nothing yet (browsers need a user gesture first)
 * - `starting`: the AudioContext is being unlocked
 * - `loading`: the context runs, the instrument is still loading (a plain synth plays meanwhile)
 * - `ready`: the instrument plays
 * - `failed`: the instrument could not load; the synth keeps playing and the next gesture retries
 */
export type AudioReadiness = "off" | "starting" | "loading" | "ready" | "failed";

export const audioReadiness = createValueStore<AudioReadiness>("off");

export function useAudioReadiness(): AudioReadiness {
  return useStoreValue(audioReadiness);
}
