import type { ScoreEntry } from "@/entities/score";

/**
 * Scores the player added, kept in this browser only (IndexedDB) — nothing
 * is uploaded, so private copies stay private.
 */
interface StoredScore {
  id: string;
  title: string;
  composer?: string;
  addedAt: number;
  /** MusicXML text, or the compressed .mxl file */
  data: string | Blob;
}

const DB_NAME = "kordi-scores";
const STORE = "scores";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

const toEntry = ({ id, title, composer }: StoredScore): ScoreEntry => ({
  id,
  title,
  composer,
  source: { kind: "local", id },
});

/** Title and composer from the MusicXML header, when it has them. */
function readHeader(xml: string) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const text = (selector: string) => doc.querySelector(selector)?.textContent?.trim() || undefined;
  return {
    title: text("work > work-title") ?? text("movement-title"),
    composer: text('identification > creator[type="composer"]'),
  };
}

export const isScoreFile = (name: string) => /\.(musicxml|xml|mxl)$/i.test(name);

export async function listLocalScores(): Promise<ScoreEntry[]> {
  const all = await run<StoredScore[]>("readonly", (s) => s.getAll() as IDBRequest<StoredScore[]>);
  return all.toSorted((a, b) => a.addedAt - b.addedAt).map(toEntry);
}

export async function addLocalScore(file: File): Promise<ScoreEntry> {
  const compressed = /\.mxl$/i.test(file.name);
  const data = compressed ? file : await file.text();
  const header: { title?: string; composer?: string } = typeof data === "string" ? readHeader(data) : {};
  const score: StoredScore = {
    id: `local:${crypto.randomUUID()}`,
    title: header.title ?? file.name.replace(/\.(musicxml|xml|mxl)$/i, ""),
    composer: header.composer,
    addedAt: Date.now(),
    data,
  };
  await run("readwrite", (s) => s.put(score));
  return toEntry(score);
}

export async function readLocalScore(id: string): Promise<string | Blob | null> {
  const score = await run<StoredScore | undefined>("readonly", (s) => s.get(id) as IDBRequest<StoredScore | undefined>);
  return score?.data ?? null;
}

export async function removeLocalScore(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}
