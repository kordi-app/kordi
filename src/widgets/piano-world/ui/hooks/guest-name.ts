/** A guest's world name, kept in this browser so it survives reloads (the server picks a new one each visit). */
const KEY = "kordi:v1:world-guest-name";
const MAX_LENGTH = 40;

/** The remembered name, or `fresh` (which is then remembered). */
export function rememberGuestName(fresh: string): string {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && saved.length <= MAX_LENGTH) return saved;
    window.localStorage.setItem(KEY, fresh);
  } catch {
    // storage unavailable (private mode): a new name per visit, as before
  }
  return fresh;
}

export function saveGuestName(name: string): void {
  try {
    window.localStorage.setItem(KEY, name);
  } catch {
    // see above
  }
}
