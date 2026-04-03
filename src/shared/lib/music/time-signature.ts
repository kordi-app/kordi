export type TimeSignature = "4/4" | "3/4" | "2/4" | "6/8";

export interface TimeSignatureConfig {
  beatsPerBar: number;
  subdivision: string;
  bpmMultiplier: number;
}

export const TIME_SIGNATURE_CONFIGS: Record<TimeSignature, TimeSignatureConfig> = {
  "4/4": { beatsPerBar: 4, subdivision: "4n", bpmMultiplier: 1 },
  "3/4": { beatsPerBar: 3, subdivision: "4n", bpmMultiplier: 1 },
  "2/4": { beatsPerBar: 2, subdivision: "4n", bpmMultiplier: 1 },
  "6/8": { beatsPerBar: 6, subdivision: "8n", bpmMultiplier: 1.5 },
};
