import { readStored, writeStored } from "@/shared/lib/storage";

/** A guest's world name, kept in this browser so it survives reloads (the server picks a new one each visit). */
const KEY = "world.guest-name";
const MAX_LENGTH = 40;

/** The remembered name, or `fresh` (which is then remembered; without storage, a new name per visit). */
export function rememberGuestName(fresh: string): string {
  const saved = readStored<unknown>(KEY, null);
  if (typeof saved === "string" && saved.length > 0 && saved.length <= MAX_LENGTH) return saved;
  writeStored(KEY, fresh);
  return fresh;
}

export function saveGuestName(name: string): void {
  writeStored(KEY, name);
}
