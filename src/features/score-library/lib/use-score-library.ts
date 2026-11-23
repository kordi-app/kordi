"use client";

import { useCallback, useEffect, useState } from "react";
import { BUILTIN_SCORES, type ScoreEntry } from "@/entities/score";
import { addLocalScore, isScoreFile, listLocalScores, readLocalScore, removeLocalScore } from "./local-scores";

/** Built-in scores plus the ones added in this browser. */
export function useScoreLibrary() {
  const [local, setLocal] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    listLocalScores()
      .then(setLocal)
      .catch(() => setLocal([]));
  }, []);

  /** Add a MusicXML / MXL file; returns the new entry, or null if it isn't one. */
  const add = useCallback(async (file: File) => {
    if (!isScoreFile(file.name)) return null;
    const entry = await addLocalScore(file);
    setLocal((current) => [...current, entry]);
    return entry;
  }, []);

  const remove = useCallback(async (id: string) => {
    await removeLocalScore(id);
    setLocal((current) => current.filter((s) => s.id !== id));
  }, []);

  return { scores: [...BUILTIN_SCORES, ...local], add, remove };
}

/** The score's contents, ready for the sheet. */
export async function loadScoreSource(entry: ScoreEntry): Promise<string | Blob | null> {
  if (entry.source.kind === "local") return readLocalScore(entry.source.id);
  const response = await fetch(entry.source.url);
  return response.ok ? response.text() : null;
}
